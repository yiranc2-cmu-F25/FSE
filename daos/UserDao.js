import bcrypt from "bcrypt";
import User from "../entities/User.js";
import { USER_STATUS } from "../constants/userStatus.js";


export class UserDao {

    constructor({ UserModel }) {
        this.UserModel = UserModel;
    }

    async create ({username , password , sharedstatus , status , role}){
        const doc = await this.UserModel.create({ username, password, sharedstatus, status, role });
        return new User ({
            id: doc._id,
            username: doc.username,
            sharedstatus: doc.sharedstatus,
            status: doc.status,
            role: doc.role,
            createdAt: doc.createdAt
        });
    }

    async validatePassword(username ,plainPassword) {
        const doc = await this.UserModel.findOne({ username });
        if (!doc) return false;
        return await bcrypt.compare(plainPassword, doc.password);  
    }

    async getUsernameById(id){
        const doc = await this.UserModel.findById(id);
        return doc ? doc.username : null;
    }

    async findByUsername(username){
        const doc = await this.UserModel.findOne({username});
        return doc ? new User ({
            id: doc._id,
            username: doc.username,
            sharedstatus: doc.sharedstatus,
            status: doc.status,
            role: doc.role,
            createdAt: doc.createdAt
        }) : null;
    }

    async getAllUsers(){
        const docs = await this.UserModel.find({status : USER_STATUS.ACTIVE}).sort({username: 1}).lean();
        return docs.map(doc => new User ({
            id: doc._id,
            username: doc.username,
            sharedstatus: doc.sharedstatus,
            status: doc.status,
            role: doc.role,
            createdAt: doc.createdAt
        }));
    }

}
