import mongoose from "mongoose";

class DatabaseConfig {
    constructor(){
        this.isConnected = false;
        this.connection = process.env.MONGO_URI;
    }

    async connect(){
        try{
            await mongoose.connect(this.connection, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
            });

            this.isConnected = true;
            console.log("Database connected successfully");

            await this.initializeModels();
        }catch(e){
            console.error("Database connection error:", e);
            throw e;
        }
    }

    async initializeModels(){
        try{

        }catch(e){
            console.error("Model initialization error:", e);
            throw e;
        }
    }

    getDataBase() {
        return mongoose;
    }

    async close(){
        try{
            if(this.isConnected){
                await mongoose.close();
                this.isConnected = false;
                console.log("Database disconnected successfully");
            }
        }catch(e){
            console.error("Database disconnection error:", e);
            throw e;
        }
    }
}

export default new DatabaseConfig();