import {createContext,useContext,useMemo,type ReactNode} from 'react';
import {useStoredState} from '../hooks/useStoredState';
import {applyAttempt,emptyLearning,studyDate,validLearning,type Attempt,type LearningState} from './model';
type Value={state:LearningState;storageError:string|null;record:(attempt:Attempt)=>void;complete:(lesson:string,task:string)=>void;restore:(state:LearningState)=>void};
const Context=createContext<Value|null>(null);
export function LearningProvider({children,onActivity}:{children:ReactNode;onActivity?:()=>void}){
 const [state,setState,storageError]=useStoredState<LearningState>('klar:learning:v1',emptyLearning(),validLearning);
 const value=useMemo<Value>(()=>({state,storageError,record:attempt=>{const id=crypto.randomUUID();setState(old=>applyAttempt(old,attempt,id,Date.now()));onActivity?.();},complete:(lesson,task)=>{setState(old=>({...old,lessons:{...old.lessons,[lesson]:[...new Set([...(old.lessons[lesson]??[]),task])]},days:[...new Set([...old.days,studyDate(Date.now())])]}));onActivity?.();},restore:setState}),[state,setState,storageError,onActivity]);
 return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useLearning(){const value=useContext(Context);if(!value)throw new Error('LearningProvider is required');return value;}
