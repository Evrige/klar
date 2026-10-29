import {createContext,useContext,useMemo,type ReactNode} from 'react';
import {useStoredState} from '../hooks/useStoredState';
import {applyAttempt,completeLessonStep,emptyLearning,validLearning,type Attempt,type LearningState} from './model';
import {miniLessons} from './lessons';
import {enqueue} from '../sync/storage';
type Value={state:LearningState;storageError:string|null;record:(attempt:Attempt)=>void;complete:(lesson:string,task:string)=>void;restore:(state:LearningState)=>void};
const Context=createContext<Value|null>(null);
export function LearningProvider({children,onActivity}:{children:ReactNode;onActivity?:()=>void}){
 const [state,setState,storageError]=useStoredState<LearningState>('klar:learning:v1',emptyLearning(),validLearning);
 const value=useMemo<Value>(()=>({state,storageError,record:attempt=>{const id=crypto.randomUUID();enqueue('attempt',attempt,id);setState(old=>applyAttempt(old,attempt,id,Date.now()));onActivity?.();},complete:(lesson,task)=>{const item=miniLessons.find(l=>l.id===lesson);if(!item)return;enqueue('step',{lessonId:lesson,stepId:task});setState(old=>completeLessonStep(old,lesson,task,['dialogue','chunks','rule',...item.tasks.map(t=>t.id)],Date.now()));onActivity?.();},restore:restored=>{enqueue('snapshot',{'klar:learning:v1':restored});setState(restored);}}),[state,setState,storageError,onActivity]);
 return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useLearning(){const value=useContext(Context);if(!value)throw new Error('LearningProvider is required');return value;}
