import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
const require = createRequire('C:/Program Files/WindowsApps/OpenAI.CodexPrimaryRuntime.v26-1105-1297-0_26.1105.1297.0_x64__3k8sg7r9htsxt/dependencies/node/node_modules/package.json');
const {Workbook, SpreadsheetFile} = await import(pathToFileURL(require.resolve('@oai/artifact-tool')).href);
const out = new URL('.', import.meta.url).pathname.replace(/^\/([A-Z]:)/,'$1');
const wb = Workbook.create();
const products = wb.worksheets.add('პროდუქტები');
const variants = wb.worksheets.add('ზომები და ფასები');
const photos = wb.worksheets.add('ფოტოები');
const guide = wb.worksheets.add('ინსტრუქცია');
const batch = 'pl-261109-' + Math.random().toString(36).slice(2,8);
const languages = ['ინგლისური','რუსული','უკრაინული','ებრაული','არაბული'];
const headers = ['პროდუქტის კოდი (ავტომატური)','დასახელება — ქართული *','კატეგორია *','ხის ჯიში *','ხარისხი *','ტენიანობა *','გაყიდვა ცალობით (ავტომატური)','გაყიდვა მ³-ით','გაყიდვა მ²-ით','გაყიდვა გრძივი მეტრით','გამოჩნდეს საიტზე','მოკლე აღწერა — ქართული *','სრული აღწერა — ქართული *',...languages.map(x=>'დასახელება — '+x),...languages.map(x=>'მოკლე აღწერა — '+x),...languages.map(x=>'სრული აღწერა — '+x)];
function col(i) {let s='';for(i++;i;i=Math.floor((i-1)/26))s=String.fromCharCode(65+(i-1)%26)+s;return s;}
function layout(s,title,note,heads,count,widths) {
  const last=col(heads.length-1), end=7+count;
  s.showGridLines=false;
  const all=s.getRange(`A1:${last}${end}`);
  all.format.font={name:'Arial',size:11,color:'#243B30'};
  all.format.verticalAlignment='center';
  all.format.rowHeight=28;
  s.getRange('A2').values=[[title]];
  s.getRange('A2').format.font={size:16,bold:true,color:'#234834'};
  s.getRange('A4').values=[[note]];
  s.getRange('A5').values=[['ღია ყვითელი — შესავსები; ღია მწვანე — სიიდან ასარჩევი; ნაცრისფერი — ავტომატური. * აუცილებელი ველი.']];
  s.getRange('A4:A5').format.font={size:11,color:'#586459'};
  s.getRange(`A7:${last}7`).values=[heads];
  s.getRange(`A7:${last}7`).format={fill:'#284D37',font:{name:'Arial',size:11,bold:true,color:'#FFFFFF'},rowHeight:58,wrapText:true,horizontalAlignment:'center',verticalAlignment:'center'};
  s.getRange(`A8:${last}${end}`).format.fill='#FFF9E8';
  for(let i=0;i<heads.length;i++)s.getRange(`${col(i)}7:${col(i)}${end}`).format.columnWidth=widths[i]||30;
  s.freezePanes.freezeRows(7);
  s.freezePanes.freezeColumns(s===products?2:1);
  s.tables.add(`A7:${last}${end}`,true, s===products?'Products':s===variants?'Variants':'Photos');
}
function dropdown(s,range,values) {
  s.getRange(range).dataValidation={rule:{type:'list',values}};
  s.getRange(range).format.fill='#EDF5EA';
}
function productList(s,range) {
  s.getRange(range).dataValidation={rule:{type:'list',formula1:`INDIRECT("'პროდუქტები'!$A$8:$A$107")`}};
  s.getRange(range).format.fill='#EDF5EA';
}
function auto(s,r){s.getRange(r).format.fill='#EEF0EF';s.getRange(r).format.font={color:'#626B65'};}
layout(products,'ახალი პროდუქციის შევსება','ერთი სტრიქონი = ერთი პროდუქტი. დაიწყეთ ქართული დასახელებით; შემდეგ შეავსეთ ზომები და ფოტოები შესაბამის ფურცლებზე.',headers,100,[34,36,25,22,18,23,24,20,20,25,23,48,60]);
products.tabColor='#284D37';
dropdown(products,'C8:C107',['ფიცარი (დაფა)','კოჭი / ბრუსი','ვაგონკა','ბლოკ-ჰაუსი','იმიტაცია ბრუსისა','ტერასის დაფა','იატაკის დაფა','რეიკა','პალეტები','სხვა']);
dropdown(products,'D8:D107',['ფიჭვი','ნაძვი','ლარიქსი','მუხა','წითელი მუხა','კოპიტი','წიფელი','ცაცხვი','მურყანი','ნეკერჩხალი']);
dropdown(products,'E8:E107',['პრემიუმი','A','B','C','AB','ABC','BC']);
dropdown(products,'F8:F107',['სველი','გამომშრალი','კამერული','თერმო']);
dropdown(products,'H8:K107',['კი','არა']);
products.getRange('A8:A107').formulas=Array.from({length:100},(_,i)=>[`=IF(B${i+8}="","","${batch}-${String(i+1).padStart(4,'0')}")`]);
products.getRange('G8:G107').formulas=Array.from({length:100},(_,i)=>[`=IF(B${i+8}="","","კი")`]);
auto(products,'A8:A107');auto(products,'G8:G107');
products.getRange('L8:AB107').format.wrapText=true;
layout(variants,'ზომები და ფასები','ჯერ აირჩიეთ პროდუქტის კოდი. ყოველი ზომა ჩაწერეთ ცალკე სტრიქონზე; ერთ პროდუქტზე დასაშვებია მაქსიმუმ 50 ზომა.',['პროდუქტის კოდი *','დასახელება (ავტომატური)','ზომის კოდი (ავტომატური)','სისქე (მმ) *','სიგანე (მმ) *','სიგრძე (მმ) *','დაფარვის სიგანე (მმ)','ფასი (₾) *','ფასის ერთეული *','ხელმისაწვდომობა *'],500,[34,36,38,18,18,18,26,20,24,26]);
productList(variants,'A8:A507');
variants.getRange('B8:B507').formulas=Array.from({length:500},(_,i)=>[`=IF(A${i+8}="","",VLOOKUP(A${i+8},'პროდუქტები'!$A$8:$B$107,2,FALSE))`]);
variants.getRange('C8:C507').formulas=Array.from({length:500},(_,i)=>[`=IF(OR(A${i+8}="",D${i+8}=""),"",A${i+8}&"-v${String(i+1).padStart(4,'0')}")`]);
auto(variants,'B8:C507');
dropdown(variants,'I8:I507',['მ³ (m3)','მ² (m2)','გრძივი მ (lm)','ცალი (piece)']);
dropdown(variants,'J8:J507',['მარაგშია','შეკვეთით']);
variants.getRange('D8:F507').dataValidation={rule:{type:'decimal',operator:'greaterThanOrEqual',formula1:0.01}};
variants.getRange('G8:G507').dataValidation={rule:{type:'custom',formula1:'OR(G8="",AND(ISNUMBER(G8),G8>=0.01,G8<=E8))'}};
variants.getRange('H8:H507').dataValidation={rule:{type:'decimal',operator:'between',formula1:0.01,formula2:10000000}};
variants.getRange('D8:H507').setNumberFormat('#,##0.00');
layout(photos,'პროდუქტის ფოტოები','თითო ფოტო — ცალკე სტრიქონზე. ჩაწერეთ HTTPS ბმული ან ფაილის სახელი; ფაილები გამოგზავნეთ Excel-თან ერთად.',['პროდუქტის კოდი *','ფოტოს HTTPS ბმული ან ფაილის სახელი *','ფოტოს აღწერა — ქართული *',...languages.map(x=>'ფოტოს აღწერა — '+x)],300,[34,58,48,38,38,38,38,38]);
productList(photos,'A8:A307');
photos.getRange('C8:H307').format.wrapText=true;
guide.showGridLines=false;
guide.getRange('A1:B28').format.font={name:'Arial',size:11,color:'#243B30'};
guide.getRange('A1:B28').format.verticalAlignment='center';
guide.getRange('A1:A28').format.columnWidth=28;
guide.getRange('B1:B28').format.columnWidth=115;
guide.getRange('A2').values=[['შევსების ინსტრუქცია']];
guide.getRange('A2').format.font={size:16,bold:true,color:'#284D37'};
const notes=[
 ['დაწყება','ფურცელზე „პროდუქტები“ შეავსეთ ქართული დასახელება. ყველა შესავსები ველი თავდაპირველად ცარიელია.'],
 ['პროდუქტის კოდი','კოდი ავტომატურად ჩნდება დასახელების შევსებისას. ნაცრისფერი სვეტები არ შეცვალოთ; კოდის ხელით ჩაწერა საჭირო არ არის.'],
 ['პროდუქტები','ერთი პროდუქტი — ერთი სტრიქონი. მომზადებულია 100 პროდუქტის ადგილი. ახალი პროდუქტი ჩაწერეთ შემდეგ ცარიელ სტრიქონზე.'],
 ['ასარჩევი ველები','მწვანე უჯრებში აირჩიეთ მნიშვნელობა ჩამოსაშლელი სიიდან. „კი/არა“ ცვლის ფორმის მონიშვნის ველებს.'],
 ['გასაყიდი ერთეულები','ცალობით გაყიდვა ფორმაში ყოველთვის ჩართულია და აქ ავტომატურია. მ³, მ² და გრძივი მეტრისთვის აირჩიეთ „კი“ ან „არა“.'],
 ['ქართული ტექსტები','შეავსეთ ქართული დასახელება, მოკლე და სრული აღწერა. დასახელება — მაქს. 250 სიმბოლო; აღწერები — მაქს. 20 000 სიმბოლო.'],
 ['სხვა ენები','ყველა ტექსტს აქვს ინგლისური, რუსული, უკრაინული, ებრაული და არაბული ველი. თუ თარგმანი არ გაქვთ, დატოვეთ ცარიელი.'],
 ['თარგმანები და გამოჩენა','Excel თარგმანს არ ქმნის. ადმინისტრატორს შეუძლია ფორმაში თარგმანების შექმნა/გადამოწმება; არასრული თარგმანით პროდუქტი შეინახება დამალულად.'],
 ['ზომები და ფასები','ფურცელზე „ზომები და ფასები“ აირჩიეთ პროდუქტის კოდი. დასახელება და ზომის კოდი ავტომატურად გამოჩნდება.'],
 ['რამდენიმე ზომა','ერთი პროდუქტის სხვადასხვა ზომაზე გაიმეორეთ იგივე პროდუქტის კოდის არჩევა. შეავსეთ მინიმუმ ერთი ზომა; მაქსიმუმ 50 ზომა პროდუქტზე.'],
 ['ზომის ერთეული','სისქე, სიგანე, სიგრძე და დაფარვის სიგანე ჩაწერეთ მილიმეტრებში; დადებითი რიცხვები, მინიმუმ 0.01.'],
 ['დაფარვის სიგანე','არასავალდებულოა. თუ ავსებთ, უნდა იყოს დადებითი და არ უნდა აღემატებოდეს იმავე სტრიქონის სიგანეს.'],
 ['ფასი და ერთეული','ფასი ჩაწერეთ ლარში, არჩეულ ერთეულზე: 0.01–10 000 000 ₾. ფასის ერთეული უნდა შედიოდეს პროდუქტის გასაყიდ ერთეულებში.'],
 ['ფოტოები','ფურცელზე „ფოტოები“ აირჩიეთ პროდუქტის კოდი; შეავსეთ ბმული ან ფაილის ზუსტი სახელი და ფოტოს აღწერა. მინიმუმ 1, მაქსიმუმ 12 ფოტო პროდუქტზე.'],
 ['ფოტოს ფორმატი','ატვირთვისთვის: JPG, PNG ან WebP; თითო ფაილი მაქსიმუმ 5 MB. პირველი ჩაწერილი ფოტო გამოიყენება მთავარ ფოტოდ.'],
 ['ფოტოს ბმული','თუ იყენებთ ბმულს, მიუთითეთ თავად სურათის ხელმისაწვდომი HTTPS მისამართი. Excel-ის ეს ფაილი ფოტოებს საიტზე არ ტვირთავს.'],
 ['კოდების შენარჩუნება','შევსებული პროდუქტის სტრიქონი არ გამოიყენოთ სხვა ახალი პროდუქტისთვის. ამ ფაილის ასლებში იგივე სტრიქონებს იგივე კოდები ექნება.'],
 ['გადაგზავნა','შეინახეთ შევსებული .xlsx და გამოგზავნეთ ფოტოფაილებთან ერთად. მონაცემები შემდეგ უნდა გადაიტანოს ადმინისტრატორმა საიტის ფორმაში.'],
 ['ფორმის შესაბამისობა','შაბლონი შედგენილია ამ პროექტის პროდუქტის დამატების ფორმისა და მის კოდში განსაზღვრული ასარჩევი მნიშვნელობების მიხედვით.']
];
guide.getRange(`A5:B${4+notes.length}`).values=notes;
guide.getRange(`A5:A${4+notes.length}`).format={font:{bold:true,color:'#284D37'},fill:'#EDF5EA',wrapText:true};
guide.getRange(`B5:B${4+notes.length}`).format.wrapText=true;
guide.getRange(`A5:B${4+notes.length}`).format.rowHeight=48;
// Exercise input-driven formulas, then restore the blank template.
for (const r of [8,57,107])products.getRange(`B${r}`).values=[['სატესტო პროდუქტი']];
variants.getRange('A8').values=[[`${batch}-0001`]];
variants.getRange('D8').values=[[25]];
wb.recalculate();
if(products.getRange('A8').values[0][0]!==`${batch}-0001` || products.getRange('A107').values[0][0]!==`${batch}-0100`) throw Error('Product code calculation failed');
if(variants.getRange('B8').values[0][0]!=='სატესტო პროდუქტი' || variants.getRange('C8').values[0][0]!==`${batch}-0001-v0001`)throw Error('Variant link calculation failed');
for (const r of [8,57,107])products.getRange(`B${r}`).clear({applyTo:'contents'});
variants.getRange('A8').clear({applyTo:'contents'});variants.getRange('D8').clear({applyTo:'contents'});
wb.recalculate();
console.log((await wb.inspect({kind:'table',range:'პროდუქტები!A7:F9',include:'values,formulas',tableMaxRows:3,tableMaxCols:6,maxChars:1600})).ndjson);
console.log((await wb.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!',options:{useRegex:true,maxResults:10},maxChars:1000})).ndjson);
for(const [s,range,name] of [[products,'A1:F11','products'],[variants,'A1:J11','variants'],[photos,'A1:D11','photos'],[guide,'A1:B12','guide']]) {
 const blob=await wb.render({sheetName:s.name,range,scale:1.3,format:'png'});
 await fs.writeFile(`${out}/${name}.png`,new Uint8Array(await blob.arrayBuffer()));
}
const file=await SpreadsheetFile.exportXlsx(wb);
await file.save(`${out}/პროდუქციის-შესავსები-ფორმა.xlsx`);
console.log('EXPORTED '+out+'/პროდუქციის-შესავსები-ფორმა.xlsx');
