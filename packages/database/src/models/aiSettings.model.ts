import { Schema, model, Document, Types } from 'mongoose';

export interface IAISettingsDocument extends Document {
  tenantId: Types.ObjectId; enabled: boolean; defaultProvider: string; defaultModel: string;
  allowedCapabilities: string[]; monthlyTokenLimit: number; perRequestTokenLimit: number; dailyRequestLimit: number;
  encryptedApiKey?: string; secretLastFour?: string; updatedBy: Types.ObjectId;
}
const AISettingsSchema = new Schema<IAISettingsDocument>({
  tenantId:{type:Schema.Types.ObjectId,required:true,unique:true,index:true}, enabled:{type:Boolean,default:false},
  defaultProvider:{type:String,required:true,default:'OPENAI'}, defaultModel:{type:String,required:true,default:'gpt-4.1-mini'},
  allowedCapabilities:{type:[String],default:[]}, monthlyTokenLimit:{type:Number,default:1_000_000,min:0},
  perRequestTokenLimit:{type:Number,default:4096,min:1,max:32768}, dailyRequestLimit:{type:Number,default:1000,min:1},
  encryptedApiKey:{type:String,select:false}, secretLastFour:String, updatedBy:{type:Schema.Types.ObjectId,required:true}
},{timestamps:true});
export const AISettingsModel=model<IAISettingsDocument>('AISettings',AISettingsSchema);
