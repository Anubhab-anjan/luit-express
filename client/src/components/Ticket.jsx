import { QRCodeSVG } from 'qrcode.react';
import { fmtDate, fmtTime, duration } from '../api.js';

export default function Ticket({ b, onCancel }) {
  const cancelled = b.status === 'cancelled';
  return (
    <article className={`ticket overflow-hidden rounded-xl bg-white shadow-sm ${cancelled ? 'opacity-60' : ''}`}>
      <div className="flex items-center justify-between bg-ink px-5 py-3 text-white">
        <span className="font-head text-lg font-bold">Luit Express</span>
        <span className="text-sm">{cancelled ? 'Cancelled' : 'Confirmed'}</span>
      </div>

      <div className="px-5 pb-5 pt-4">
        <div className="flex items-center gap-3">
          <div>
            <p className="font-head text-2xl font-bold">{b.origin}</p>
            <p className="text-sm">{fmtTime(b.departs_at)}</p>
          </div>
          <div className="flex flex-1 flex-col items-center px-1">
            <span className="text-xs">{duration(b.departs_at, b.arrives_at)}</span>
            <div className="flex w-full items-center">
              <span className="h-2.5 w-2.5 rounded-full border-2 border-ink bg-white" />
              <span className="h-0.5 flex-1 bg-leaf" />
              <span className="h-2.5 w-2.5 rounded-full bg-ink" />
            </div>
          </div>
          <div className="text-right">
            <p className="font-head text-2xl font-bold">{b.destination}</p>
            <p className="text-sm">{fmtTime(b.arrives_at)}</p>
          </div>
        </div>
        <p className="mt-3 text-sm">{fmtDate(b.departs_at)} &middot; {b.bus_type} &middot; {b.reg_no}</p>
      </div>

      {/* dashed tear line sits where the notches are */}
      <div className="mx-5 border-t-2 border-dashed border-mist" />

      <div className="flex items-center justify-between gap-4 px-5 py-4">
        <dl className="text-sm leading-6">
          <div className="flex gap-2"><dt className="w-14">Ref</dt><dd className="font-semibold">{b.ref}</dd></div>
          <div className="flex gap-2"><dt className="w-14">Seats</dt><dd className="font-semibold">{b.seats.join(', ')}</dd></div>
          <div className="flex gap-2"><dt className="w-14">Paid</dt><dd className="font-semibold">₹{Number(b.amount)}</dd></div>
          {cancelled && <div className="flex gap-2"><dt className="w-14">Refund</dt><dd className="font-semibold">₹{Number(b.refund_amount)}</dd></div>}
        </dl>
        {!cancelled && <QRCodeSVG value={b.ref} size={92} fgColor="#2b6777" />}
      </div>

      {!cancelled && new Date(b.departs_at) > new Date() && (
        <div className="bg-mist/50 px-5 py-2.5 text-right">
          <button onClick={() => onCancel(b)} className="text-sm font-semibold underline underline-offset-2">Cancel this ticket</button>
        </div>
      )}
    </article>
  );
}
