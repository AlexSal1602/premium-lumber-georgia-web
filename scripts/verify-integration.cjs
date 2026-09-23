require('dotenv').config({ quiet: true });
const { PrismaClient }=require('@prisma/client');
const db=new PrismaClient();
async function main(){
 const counts={products:await db.product.count(),categories:await db.category.count(),orders:await db.order.count(),admins:await db.adminUser.count()};
 console.log('Database counts:',counts);
 const rls=await db.$queryRaw`SELECT relname, relrowsecurity FROM pg_class WHERE relnamespace='public'::regnamespace AND relname IN ('Order','OrderItem','Product','Category','ProductVariant','Post','AdminUser')`;
 if(rls.length!==7 || rls.some(t=>!t.relrowsecurity)) throw new Error('RLS verification failed');
 console.log('All seven application tables have RLS enabled.');
 const bucket=await db.$queryRaw`SELECT id, public, file_size_limit FROM storage.buckets WHERE id='product-images'`;
 console.log('Image bucket ready:',bucket.length===1 && bucket[0].public && Number(bucket[0].file_size_limit)===5242880);
 const settings=await fetch(process.env.SUPABASE_URL+'/auth/v1/settings',{headers:{apikey:process.env.SUPABASE_PUBLISHABLE_KEY}});
 console.log('Supabase Auth API key accepted:',settings.ok);
 if(!settings.ok) process.exitCode=1;
 for(const table of ['Order','OrderItem','AdminUser']) {
  const response=await fetch(process.env.SUPABASE_URL+'/rest/v1/'+table+'?select=*',{headers:{apikey:process.env.SUPABASE_PUBLISHABLE_KEY}});
  const payload=await response.json();
  if(response.ok && (!Array.isArray(payload)||payload.length)) throw new Error('Unexpected anonymous data access');
  console.log('Anonymous access blocked/empty:',table);
 }
}
main().catch(e=>{console.error('Integration verification failed:',e.code || e.name);process.exitCode=1;}).finally(()=>db.$disconnect());
