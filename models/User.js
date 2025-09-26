import mongoose  from "mongoose";
import bcrypt  from "bcrypt";
import { ForbiddenUsernames }  from "../config/ForbiddenUsernamesConfig.js";
import { USER_ROLE } from "../constants/userRole.js";
import { USER_STATUS } from "../constants/userStatus.js";
import { SHARED_STATUS } from "../constants/sharedStatus.js";

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


UserSchema.methods.validatePassword = async function (password) {
    try{
        return await bcrypt.compare(password, this.password);
    }catch(e){
        throw new Error('Password validation error');
    }
};

UserSchema.methods.toJSON = function () {
    const user = this.toObject();
    return {
        _id: user._id,
        username: user.username,
        sharedstatus: user.sharedstatus,
        status: user.status,
        role: user.role
    };
};

UserSchema.statics.getUsernameById = async function(userId){
    const user = await this.findById(userId);
    return user ? user.username : null;
};

UserSchema.statics.findByUsername = function(username){
    return this.findOne({ username });
};

//Get all users in database which status is active
UserSchema.statics.getAllUsers = function(){
    return this.find({status : "active"}, 'username').sort({ username: 1 });
}

const User = mongoose.model("User", UserSchema);

export default User;



