import {Button} from '../components/ui';
import { useEffect, useRef, useState } from 'react';
import { Mic, Square, Trash2 } from 'lucide-react';
import { useLocale } from '../i18n/Locale';
export default function VoiceRecorder() {
    const { t } = useLocale();
    const [recording, setRecording] = useState(false), [starting, setStarting] = useState(false), [url, setUrl] = useState(''), [error, setError] = useState('');
    const media = useRef<MediaRecorder | null>(null), stream = useRef<MediaStream | null>(null), blobUrl = useRef(''), alive = useRef(true), timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    useEffect(() => { alive.current = true; return () => { alive.current = false; clearTimeout(timer.current); if (media.current?.state === 'recording')
        media.current.stop(); stream.current?.getTracks().forEach(track => track.stop()); if (blobUrl.current)
        URL.revokeObjectURL(blobUrl.current); }; }, []);
    async function start() {
        if (starting || recording)
            return;
        setStarting(true);
        setError('');
        try {
            if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder)
                throw new Error(t('Запись недоступна в этом браузере. Откройте HTTPS-версию или localhost.', 'Запис недоступний у цьому браузері. Відкрийте HTTPS-версію або localhost.'));
            const audio = await navigator.mediaDevices.getUserMedia({ audio: true });
            if (!alive.current) {
                audio.getTracks().forEach(track => track.stop());
                return;
            }
            stream.current = audio;
            const recorder = new MediaRecorder(audio);
            media.current = recorder;
            const chunks: BlobPart[] = [];
            recorder.ondataavailable = e => { if (e.data.size)
                chunks.push(e.data); };
            recorder.onstop = () => { clearTimeout(timer.current); audio.getTracks().forEach(track => track.stop()); if (!alive.current)
                return; if (blobUrl.current)
                URL.revokeObjectURL(blobUrl.current); blobUrl.current = URL.createObjectURL(new Blob(chunks, { type: recorder.mimeType })); setUrl(blobUrl.current); setRecording(false); };
            recorder.start();
            setRecording(true);
            timer.current = setTimeout(() => { if (recorder.state === 'recording')
                recorder.stop(); }, 60000);
        }
        catch (e) {
            stream.current?.getTracks().forEach(track => track.stop());
            setError(e instanceof DOMException && e.name === 'NotAllowedError' ? t('Микрофон не разрешён. Можно произнести фразу без записи.', 'Мікрофон не дозволено. Можна вимовити фразу без запису.') : e instanceof Error ? e.message : t('Не удалось начать запись.', 'Не вдалося почати запис.'));
        }
        finally {
            if (alive.current)
                setStarting(false);
        }
    }
    return <div className="voice-recorder"><div className="learning-actions"><Button disabled={starting} onClick={() => recording ? media.current?.stop() : void start()} variant="secondary">{recording ? <Square size={16}/> : <Mic size={16}/>} {recording ? t('Остановить запись', 'Зупинити запис') : t('Записать свой голос', 'Записати свій голос')}</Button>{url && !recording && <Button onClick={() => { URL.revokeObjectURL(blobUrl.current); blobUrl.current = ''; setUrl(''); }} variant="secondary"><Trash2 size={15}/>{t('Удалить запись', 'Видалити запис')}</Button>}</div>{recording && <p role="status">{t('Идёт запись · максимум 60 секунд', 'Триває запис · максимум 60 секунд')}</p>}{url && <audio controls src={url}/>}<p className="course-caption">{t('Запись остаётся в памяти этой страницы и исчезнет при выходе. Она никуда не отправляется. Сравните со звучанием образца; автоматической оценки произношения нет.', 'Запис залишається в пам’яті цієї сторінки та зникне після виходу. Він нікуди не надсилається. Порівняйте зі звучанням зразка; автоматичного оцінювання вимови немає.')}</p>{error && <p role="alert">{error}</p>}</div>;
}
