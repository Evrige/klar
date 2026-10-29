import catalog from './germanCourse.json' with {type:'json'};
export const courseLevels=['A0','A1','A2','B1','B2','C1','C2'] as const;
export type CourseLevel=typeof courseLevels[number];
export const courseLessons=catalog.lessons.map(item=>({...item,id:`youtube-${item.videoId}`,level:item.level as CourseLevel,url:`https://www.youtube.com/watch?v=${item.videoId}&list=${catalog.playlistId}`})).sort((a,b)=>courseLevels.indexOf(a.level)-courseLevels.indexOf(b.level)||a.number-b.number);
export const supplementary=catalog.supplementary;
export type LessonRecord={video:boolean;practice:boolean;note:string};
export type CourseProgress=Record<string,LessonRecord>;
export const blankLesson=():LessonRecord=>({video:false,practice:false,note:''});
const ids=new Set(courseLessons.map(l=>l.id));
export function validCourseProgress(value:unknown):value is CourseProgress{
 return !!value&&typeof value==='object'&&!Array.isArray(value)&&Object.entries(value).every(([id,v])=>ids.has(id)&&!!v&&typeof v==='object'&&typeof v.video==='boolean'&&typeof v.practice==='boolean'&&typeof v.note==='string'&&v.note.length<=10000);
}
export function lessonComplete(record:LessonRecord|undefined){return !!record?.video&&!!record?.practice;}
export function nextLesson(progress:CourseProgress){return courseLessons.find(l=>!lessonComplete(progress[l.id]))??courseLessons[courseLessons.length-1];}
// The platform exports lesson arrays; only known video IDs and learning fields are accepted.
export function parseCourseImport(raw:unknown):CourseProgress{
 const candidates=Array.isArray(raw)?raw:raw&&typeof raw==='object'&&'lessons' in raw?(raw as {lessons:unknown}).lessons:null;
 if(!Array.isArray(candidates))throw new Error('Ожидается экспорт с массивом lessons из платформы обучения.');
 const result:CourseProgress={};
 for(const item of candidates){
  if(!item||typeof item!=='object'||!ids.has(item.id))continue;
  if(typeof item.video!=='boolean'||typeof item.practice!=='boolean'||typeof item.note!=='string'||item.note.length>10000)throw new Error('В импорте есть повреждённые данные урока. Ничего не изменено.');
  if(result[item.id])throw new Error('В импорте повторяется один урок. Ничего не изменено.');
  result[item.id]={video:item.video,practice:item.practice,note:item.note};
 }
 if(!Object.keys(result).length)throw new Error('В файле нет знакомых уроков немецкого курса.');
 return result;
}
export function mergeCourseProgress(previous:CourseProgress,incoming:CourseProgress):CourseProgress{
 const merged={...previous};for(const [id,r] of Object.entries(incoming)){
  const old=previous[id]??blankLesson();
  const note=old.note&&r.note&&old.note!==r.note?`${old.note}\n\n— Импорт —\n${r.note}`:old.note||r.note;
  if(note.length>10000)throw new Error('Объединённая заметка превышает 10000 символов. Сократите заметки перед импортом. Ничего не изменено.');
  merged[id]={video:old.video||r.video,practice:old.practice||r.practice,note};
 }return merged;
}
