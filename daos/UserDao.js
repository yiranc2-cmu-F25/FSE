import mongoose  from "mongoose";
import bcrypt  from "bcrypt";
import { ForbiddenUsernames }  from "../config/ForbiddenUsernamesConfig.js";
import { USER_ROLE } from "../constants/userRole.js";
import { USER_STATUS } from "../constants/userStatus.js";
import { SHARED_STATUS } from "../constants/sharedStatus.js";
import User from "../entities/User.js";

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true , trim: true, minlength: 3,lowercase: true
        , validate:{
            validator: (v) => {
                return !ForbiddenUsernames.includes(v) && !v.includes('.') ;
            },
            message: props => `${props.value} is not allowed as a username.`
        }
    },
    password: { type: String, required: true, minlength:4},
    sharedstatus: {type:String, enum: Object.values(SHARED_STATUS) , default: SHARED_STATUS.UNDEFINED},
    status: {type:String, enum: Object.values(USER_STATUS) ,default: USER_STATUS.ACTIVE},
    role: {type:String, enum: Object.values(USER_ROLE) ,default: USER_ROLE.CITIZEN},
    createdAt: { type: Date, default: Date.now },
});


UserSchema.pre("save", async function () {
    if(this.isModified("password") || this.isNew){
        this.password = await bcrypt.hash(this.password, 10)
    }
});

const UserModel  = mongoose.model("User", UserSchema);

// validatePassword , toJSON , getUsernameById , findByUsername , getAllUsers

class UserDao {
    static async create ({username , password , sharedstatus , status , role}){
        const doc = await UserModel.create({ username, password, sharedstatus, status, role });
        return new User ({
            id: doc._id,
            username: doc.username,
            sharedstatus: doc.sharedstatus,
            status: doc.status,
            role: doc.role,
            createdAt: doc.createdAt
        });
    }

    static async validatePassword(username ,plainPassword) {
        const doc = await UserModel.findOne({ username });
        if (!doc) return false;
        return await bcrypt.compare(plainPassword, doc.password);  
    }

    static async getUsernameById(id){
        const doc = await UserModel.findById(id);
        return doc ? doc.username : null;
    }

    static async findByUsername(username){
        const doc = await UserModel.findOne({username});
        return doc ? new User ({
            id: doc._id,
            username: doc.username,
            sharedstatus: doc.sharedstatus,
            status: doc.status,
            role: doc.role,
            createdAt: doc.createdAt
        }) : null;
    }
    static async getAllUsers(){
        const docs = await UserModel.find({status : USER_STATUS.ACTIVE}).sort({username: 1}).lean();
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

export default UserDao;



