import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ObjectId } from 'mongodb';
import { Model } from 'mongoose';
import { IFile, IRole, IUserFileRecord } from 'src/interfaces';
import { WinstonLoggerService } from 'src/winston-logger.service';
import { v4 as uuidv4 } from 'uuid';
import { extname } from 'path';
import { UserService } from 'src/user/user.service';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import axios from 'axios';

const deleteFolderUtil = promisify(fs.rm);

@Injectable()
export class FilesService {
    constructor(
        @InjectModel('Files') private readonly fileModel: Model<IFile>,
        private readonly loggerService: WinstonLoggerService,
        private userService: UserService
    ){}

    async getRSABase64(userID: ObjectId, fileID: ObjectId){
        const file = await this.fileModel.findById(fileID.toString());
        if(!file) {
            this.loggerService.error(`File with ID ${fileID} does not exist`)
            throw new HttpException('File does not exists', HttpStatus.BAD_REQUEST);
        }
        const rsa_priv_base64 = file.rsa_priv_base64;
        await this.fileModel.findByIdAndUpdate(file._id, {'rsa_priv_base64': ''});
        await this.userService.revokeFileAccess(userID, fileID);
        return rsa_priv_base64;
    }

    async saveFile(file): Promise<any> {
        const { buffer, originalname } = file;
        const extension = extname(originalname);
        const uuid = `${uuidv4()}`;
        const tempImagePath = `/app/store/uploads/${uuid}`;
        try {
            return new Promise((resolve, reject) => {
                const writeStream = fs.createWriteStream(tempImagePath);
            
                writeStream.on('error', (error) => {
                  this.loggerService.error(`Error saving file: ${error}`);
                  reject(`Error saving file: ${error}`);
                });
            
                writeStream.on('finish', () => {
                  this.loggerService.info(`Temporary image saved successfully: ${tempImagePath}`);
                  resolve({ originalname, uuid, extension });
                });
            
                writeStream.write(buffer);
                writeStream.end();
            });
        } catch (error) {
            this.loggerService.error(`Error saving file: ${error}`);
            return `Error saving file: ${error}`;
        } 
    }
    
    async encryptFile(savedFile) {
        try {
            const response = await axios.post(`${process.env.FLASK_MICROSERVICE_API_URL}/encrypt`, {
                uuid: savedFile.uuid,
            });
            return response.data.rsa_priv_base64;
        } catch (error) {
            this.loggerService.error(`encryptFile : ${error}`);
            return JSON.stringify({ error: `Flask: ${error}` });
        }
    }

    async decryptFile(uuid: string, rsa_priv_base64: string) : Promise<string> {
        try {
            await axios.post(`${process.env.FLASK_MICROSERVICE_API_URL}/decrypt`, {
                uuid: uuid,
                rsa_priv_base64: rsa_priv_base64
            });
            this.loggerService.info(`decryptFile: ${uuid} decrypted successfully`);
            return `store/uploads/${uuid}`;
        } catch (error) {
            this.loggerService.error(`decrypter : ${error}`);
            return JSON.stringify({ error: `Flask: ${error}` });
        }
    }
    
    async getUserFiles(userId: ObjectId): Promise<any> {
        return await this.userService.getUserFiles(userId.toString());
    }

    async createFile(userID: ObjectId, file: Express.Multer.File) : Promise<IUserFileRecord> {
        const user = await this.userService.findById(userID.toString());
        let savedFile;
        let resultCreateFile;
        if(!user) {
            this.loggerService.error(`createFile: User with ID ${userID} does not exist`)
            throw new HttpException('User does not exists', HttpStatus.BAD_REQUEST);
        }
        // Saving to server
        try{
            savedFile = await this.saveFile(file);
            var fileSize = (fs.statSync(path.join(__dirname, '..', '..', 'store', 'uploads', `${savedFile.uuid}`)).size)/1000;
            var rsa_priv_base64 = await this.encryptFile(savedFile);
            this.loggerService.info(`createFile: File ${savedFile.uuid} saved to server`);
        }catch(error){
            this.loggerService.error(`createFile: ${error}`);
            return error;
        }


        // Saving to db
        try{
            const createFileDTO : IFile = {
                originalname: `${savedFile.originalname}${savedFile.extension}`,
                uuid: `${savedFile.uuid}`,
                rsa_priv_base64: `${rsa_priv_base64}`,
                size: fileSize,
                ownerID: userID,
                // gems: [{
                //     index: 0,
                //     enc: "none"
                // }]
            }
            // save to filesModel
            const createdFile = new this.fileModel(createFileDTO);
            resultCreateFile = await createdFile.save();
            // save to usersModel
            var userFileRecord : IUserFileRecord = {
                originalname: savedFile.originalname,
                fileID: resultCreateFile._id,
                access: 1,
                size: fileSize,
                role: [IRole.OWNER, IRole.EDITOR, IRole.VIEWER]
            }
            await this.userService.addFileToUser(userID.toString(), userFileRecord);
            this.loggerService.info(`File ${savedFile.uuid} added to db and user profile.`);
        }catch(error){
            this.deleteFileUtil(`store/uploads/${savedFile.uuid}`)
            await deleteFolderUtil(`store/gems/${savedFile.uuid}`, { recursive: true });
            this.loggerService.error(`Unable to add file : ${savedFile.uuid} to db. Deleted from server. `);
            return error;
        }
        return userFileRecord;
    }

    async downloadFile(fileID: ObjectId, user_priv_base64: string): Promise<string> {
        const file = await this.fileModel.findById(fileID.toString());
        if(!file) {
            this.loggerService.error(`File with ID ${fileID} does not exist`)
            throw new HttpException('File does not exists', HttpStatus.BAD_REQUEST);
        }
        try{
            if(file.rsa_priv_base64 == "") return this.decryptFile(file.uuid, user_priv_base64);
            else return this.decryptFile(file.uuid, file.rsa_priv_base64);
        }catch(err){
            this.loggerService.error(`downloadFile: ${err}`);
        }
    }

    async clearCachedFile(fileID: ObjectId): Promise<void> {
        const file = await this.fileModel.findById(fileID.toString());
        if(!file) {
            this.loggerService.error(`File with ID ${fileID} does not exist`)
            throw new HttpException('File does not exists', HttpStatus.BAD_REQUEST);
        }
        try{
            this.deleteFileUtil(`store/uploads/${file.uuid}`)
        }catch(err){
            this.loggerService.error(`downloadFile: ${err}`);
        }
    }

    async deleteFileUtil(url: string): Promise<string> {
        return new Promise(() => {
            fs.unlink(url, (error) => {
              if (error) {
                this.loggerService.error(`While deleting from server: ${error}`);
              } else {
                this.loggerService.info(`File deleted from server: ${url}`);
              }
            });
        });
    }
    
    async delete(userID: ObjectId, fileID: ObjectId, location: string): Promise<string> {
        const file = await this.fileModel.findById(fileID.toString());
        if(!file) {
            this.loggerService.error(`File with ID ${fileID} does not exist`)
            throw new HttpException('File does not exists', HttpStatus.BAD_REQUEST);
        }
        if(location == 'server' || location == 'all'){
            // Deleting from server
            try {
                await deleteFolderUtil(`store/files/${file.uuid}`, { recursive: true })
                this.loggerService.info(`store/files : ${file.uuid} : deleted successfully`);
            }catch (error) {
                this.loggerService.error(`store/files : ${file.uuid} : ${error}`);
            }
            try{
                await deleteFolderUtil(`store/gems/${file.uuid}`, { recursive: true })
                this.loggerService.info(`store/gems : ${file.uuid} : deleted successfully`);
            }catch(error){
                this.loggerService.error(`store/gems : ${file.uuid} : ${error}`);
            }
        }
        if(location == 'db' || location == 'all'){
            // Deleting from db
            try{
                await this.userService.deleteUsersFile(userID, fileID, file.size);
                await this.fileModel.findByIdAndDelete(fileID);
                this.loggerService.info(`File deleted from db: ${fileID}`);
            }catch(error){
                this.loggerService.error(`Unable to delete file from db: ${error}`);
            }
        }
        return file.uuid;
    }
}
