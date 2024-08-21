import dotenv from 'dotenv';
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";


// Getting variables
dotenv.config();

const getPresignUrl = async (key, extension, type) => {
    try {

        const s3Client = new S3Client({ 
            credentials: {
                accessKeyId: process.env.S3_ACCESS_KEY,
                secretAccessKey: process.env.S3_ACCESS_SECRET
            },
            region: process.env.AWS_REGION 
        });
        
        const bucketParams = {
            Bucket: process.env.AWS_BUCKET,
            Key: key,
        };
          
        let command;
        
        if (type === "putObject") {
            command = new PutObjectCommand(bucketParams);
        } else {
            command = new GetObjectCommand(bucketParams);
        }
          
        const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
          
        return {
            status: "Success",
            message: url
        };
                
    } catch (error) {
        console.error(error.message);
        throw new Error(error);
    }  
};

export { getPresignUrl };