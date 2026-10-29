export default function Loading({label='Klar',full=false}:{label?:string;full?:boolean}){
    return <div className={`app-loading${full?' app-loading-full':''}`} role="status"><span className="loading-spinner" aria-hidden="true"/><span>{label}</span></div>;
}
