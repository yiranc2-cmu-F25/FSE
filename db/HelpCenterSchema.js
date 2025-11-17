import mongoose from "mongoose";
import { HELP_CENTER_TYPE } from "../constants/helpCenterType.js";


export function makeHelpCenterModel(conn) {
    const HelpCenterSchema = new mongoose.Schema({
        name: {
            type: String,
            required: true
        },
        type: [{
            type: String,
            enum: Object.values(HELP_CENTER_TYPE),
            required: true
        }],
        location: {
            type: String,
            required: true,
        },
        description: {
            type: String,
            required: true
        },
        coordinates: {
            type: [Number],
            required: true
        },
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        createdAt: { 
            type: Date,
            required: true,
            default: Date.now
        },
        updatedAt: { 
            type: Date,
            required: true,
            default: Date.now
        }
    });

    HelpCenterSchema.index({ coordinates: "2dsphere" });

    return conn.model("HelpCenter", HelpCenterSchema);
}
