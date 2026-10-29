import {createContext,useContext,type ReactNode} from 'react';
const RuleContext=createContext<((topic:string)=>void)|null>(null);
export function RuleNavigationProvider({onOpenRule,children}:{onOpenRule:(topic:string)=>void;children:ReactNode}){return <RuleContext.Provider value={onOpenRule}>{children}</RuleContext.Provider>;}
export const useRuleNavigation=()=>useContext(RuleContext);
