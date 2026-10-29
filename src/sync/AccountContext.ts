import {createContext,useContext} from 'react';
export type AccountUser={id:string;name:string;role:'USER'|'ADMIN'};
export const AccountContext=createContext<{user:AccountUser|null;rename:(name:string)=>void}>({user:null,rename:()=>{}});
export const useAccount=()=>useContext(AccountContext);
