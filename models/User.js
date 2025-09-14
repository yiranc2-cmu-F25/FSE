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
            message: props => `${props.value} is not allowed as a username. Please choose another one.`
        }
    },
    password: { type: String, required: true, minlength:4},
    sharedstatus: {type:Number, enum: Object.values(SHARED_STATUS) ,default:0 },
    status: {type:Number, enum: Object.values(USER_STATUS) ,default:0 },
    role: {type:Number, enum: Object.values(USER_ROLE) ,default:0 },
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

UserSchema.static.findByUsername = function(username){
    return this.findOne({ username });
};

const User = mongoose.model("User", UserSchema);

export default User;



