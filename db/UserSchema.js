import mongoose from "mongoose";
import bcrypt  from "bcrypt";
import { ForbiddenUsernames } from "../config/ForbiddenUsernamesConfig.js";
import { USER_ROLE } from "../constants/userRole.js";
import { USER_STATUS } from "../constants/userStatus.js";
import { SHARED_STATUS } from "../constants/sharedStatus.js";

export function makeUserModel(conn) {
    const UserSchema = new mongoose.Schema({
        username: {
        type: String, required: true, unique: true, trim: true, minlength: 3, lowercase: true,
        validate: {
            validator: (v) => !ForbiddenUsernames.includes(v) && !v.includes('.'),
            message: (props) => `${props.value} is not allowed as a username.`
        }
        },
        password: { type: String, required: true, minlength: 4 },
        sharedstatus: { type: String, enum: Object.values(SHARED_STATUS), default: SHARED_STATUS.UNDEFINED },
        status: { type: String, enum: Object.values(USER_STATUS), default: USER_STATUS.ACTIVE },
        role: { type: String, enum: Object.values(USER_ROLE), default: USER_ROLE.CITIZEN },
        skills: { type: [String], default: [] },
        createdAt: { type: Date, default: Date.now },
    });

    UserSchema.pre("save", async function () {
        if(this.isModified("password") || this.isNew){
            this.password = await bcrypt.hash(this.password, 10)
        }
    });

    return conn.model("User", UserSchema);
}
