import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Camera, SendHorizontal, X } from '../components/icons';
import { api, assetUrl, type ChatMessage } from '../api';
import { Screen } from '../components/Layout';
import { ErrorBox, Loading, Notice, ProductThumb, StatusBadge, initials } from '../components/ui';
import { dateTime } from '../format';
import { firstName } from '../components/cards';
import { useErrorText, useI18n } from '../i18n';

export default function OrderChat() {
  const id = Number(useParams().id);
  const { t, lang } = useI18n();
  const errText = useErrorText();
  const qc = useQueryClient();
  const order = useQuery({ queryKey: ['order', id], queryFn: () => api.order(id) });
  const messages = useQuery({ queryKey: ['messages', id], queryFn: () => api.messages(id), refetchInterval: 4_000 });
  const [text, setText] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const bottom = useRef<HTMLDivElement>(null);

  const send = useMutation({
    mutationFn: () => api.sendMessage(id, { text: text.trim() || null, imageUrl: image }),
    onSuccess: (m) => {
      qc.setQueryData<ChatMessage[]>(['messages', id], (old) => [...(old ?? []), m]);
      setText('');
      setImage(null);
    },
  });

  const count = messages.data?.length ?? 0;
  useEffect(() => { bottom.current?.scrollIntoView({ block: 'end' }); }, [count]);
  useEffect(() => () => { qc.invalidateQueries({ queryKey: ['order', id] }); qc.invalidateQueries({ queryKey: ['myOrders'] }); qc.invalidateQueries({ queryKey: ['me'] }); }, [qc, id]);

  async function pick(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setUploadErr(null);
    try {
      setImage((await api.upload(file)).url);
    } catch (e) {
      setUploadErr(errText(e));
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if ((text.trim() || image) && !send.isPending) send.mutate();
  }

  const o = order.data;
  const other = o ? (o.myRole === 'BUYER' ? o.traveler.name : o.buyer.name) : '';
  const title = o ? t('chat.title', { name: firstName(other) }) : t('chat.titlePlain');

  return (
    <Screen back={`/orders/${id}`} title={title} hideNav>
      {o && (
        <Link to={`/orders/${id}`} className="status-strip chat-order">
          <ProductThumb src={o.imageUrl} category={o.category} size={40} />
          <span className="grow chat-order-name">{o.productName}</span>
          <StatusBadge status={o.status} />
        </Link>
      )}

      {(messages.isLoading || order.isLoading) && <Loading />}
      {messages.error && <ErrorBox error={messages.error} onRetry={() => messages.refetch()} />}
      {messages.data && count === 0 && <p className="fine center chat-empty">{t('chat.empty')}</p>}

      <ol className="chat-list">
        {(messages.data ?? []).map((m, i, all) => {
          const prev = all[i - 1];
          const grouped = prev && prev.senderId === m.senderId
            && new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime() < 5 * 60_000;
          return (
            <li key={m.id} className={`chat-msg ${m.mine ? 'is-mine' : 'is-theirs'} ${grouped ? 'is-grouped' : ''}`}>
              {!m.mine && !grouped && <span className="avatar chat-avatar">{initials(m.senderName)}</span>}
              <div className="chat-bubble">
                {m.imageUrl && (
                  <a href={assetUrl(m.imageUrl) ?? '#'} target="_blank" rel="noreferrer">
                    <img className="chat-image" src={assetUrl(m.imageUrl) ?? ''} alt={t('chat.photo')} />
                  </a>
                )}
                {m.text && <p>{m.text}</p>}
              </div>
              <time className="chat-time">{dateTime(m.createdAt, lang)}</time>
            </li>
          );
        })}
      </ol>
      <div ref={bottom} />

      <form className="action-bar chat-composer" onSubmit={submit}>
        {(image || uploading || uploadErr || send.error) && (
          <div className="chat-attach">
            {image && (
              <span className="chat-attach-preview">
                <img src={assetUrl(image) ?? ''} alt="" />
                <button type="button" className="icon-btn is-small" aria-label={t('img.remove')} onClick={() => setImage(null)}><X size={16} /></button>
              </span>
            )}
            {uploading && <span className="fine">{t('img.uploading')}</span>}
            {(uploadErr || send.error) && <Notice tone="bad">{uploadErr ?? errText(send.error)}</Notice>}
          </div>
        )}
        <div className="chat-row">
          <button type="button" className="icon-btn" aria-label={t('chat.photo')} onClick={() => fileInput.current?.click()} disabled={uploading}>
            <Camera size={20} />
          </button>
          <input ref={fileInput} type="file" accept="image/*" hidden onChange={(e) => pick(e.target.files?.[0])} />
          <textarea
            className="chat-input"
            rows={1}
            maxLength={1000}
            value={text}
            placeholder={t('chat.placeholder')}
            aria-label={t('chat.placeholder')}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) submit(e);
            }}
          />
          <button className="btn btn-primary chat-send" aria-label={t('chat.send')} disabled={send.isPending || uploading || (!text.trim() && !image)}>
            <SendHorizontal size={18} />
          </button>
        </div>
      </form>
    </Screen>
  );
}
