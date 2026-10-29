import nodemailer from 'nodemailer';
import {MailtrapTransport} from 'mailtrap';
export type AuthMail={to:string;subject:string;text:string};
export type MailSender=(message:AuthMail)=>Promise<void>;
const provider=()=>process.env.MAIL_PROVIDER?.trim()||'smtp';
export function mailConfigured(){
    if(provider()==='mailtrap')return !!process.env.MAILTRAP_API_TOKEN?.trim()&&!!process.env.MAILTRAP_FROM_EMAIL?.trim();
    return provider()==='smtp'&&!!process.env.SMTP_HOST&&!!process.env.SMTP_FROM;
}
export const sendAuthMail:MailSender=async message=>{
    if(!mailConfigured())throw new Error('AUTH_MAIL_NOT_CONFIGURED');
    if(provider()==='mailtrap'){
        const transport=nodemailer.createTransport(MailtrapTransport({token:process.env.MAILTRAP_API_TOKEN!.trim()}));
        const mail={...message,from:{address:process.env.MAILTRAP_FROM_EMAIL!.trim(),name:process.env.MAILTRAP_FROM_NAME?.trim()||'Klar'},category:'Klar Authentication',disableFileAccess:true,disableUrlAccess:true};
        // Never propagate SDK errors containing request configuration or tokens.
        try{const result=await transport.sendMail(mail);if(result.success!==true)throw new Error('Rejected');}
        catch{throw new Error('AUTH_MAIL_DELIVERY_FAILED');}
        finally{transport.close();}
        return;
    }
    const port=Number(process.env.SMTP_PORT??587);
    if(!Number.isInteger(port)||port<1||port>65535)throw new Error('Invalid SMTP port');
    const secure=process.env.SMTP_SECURE==='true'||port===465;
    const transport=nodemailer.createTransport({
        host:process.env.SMTP_HOST,port,secure,
        requireTLS:(process.env.NODE_ENV==='production'||process.env.VERCEL_ENV==='production')&&!secure,
        ...(process.env.SMTP_USER?{auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASS}}:{}),
        connectionTimeout:10000,greetingTimeout:10000,socketTimeout:15000,
        disableFileAccess:true,disableUrlAccess:true,logger:false,debug:false,
    });
    try{await transport.sendMail({from:process.env.SMTP_FROM,...message});}finally{transport.close();}
};
