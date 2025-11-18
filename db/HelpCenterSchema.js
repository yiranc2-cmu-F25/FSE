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
            validate: {
                validator: function (arr) {
                    // Must be exactly 2 numbers
                    if (!Array.isArray(arr) || arr.length !== 2) return false;

                    const [lon, lat] = arr;

                    // Must be finite numbers
                    if (!Number.isFinite(lon) || !Number.isFinite(lat)) return false;

                    // Within valid bounds
                    const validLon = lon >= -180 && lon <= 180;
                    const validLat = lat >= -90 && lat <= 90;

                    return validLon && validLat;
                },
                message: "Coordinates must be [longitude, latitude] within valid geographic bounds."
            },
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
