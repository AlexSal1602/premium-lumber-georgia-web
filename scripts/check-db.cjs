require('dotenv').config({ quiet: true });
const {PrismaClient}=require('@prisma/client');
const db=new PrismaClient();
db.$queryRaw`SELECT 1`.then(()=>console.log('Database reachable')).catch(e=>{ console.error('Database check failed:',e.errorCode || e.code || e.name); let message=String(e.message); for(const value of Object.values(process.env)) if(value && value.length>8) message=message.split(value).join('[redacted]'); console.error(message.replace(/postgres(?:ql)?:[^\s]+/g,'[database URL]'));  process.exitCode=1; }).finally(()=>db.$disconnect());
