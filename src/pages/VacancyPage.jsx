import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

const TYPE_LABEL = { single: 'Single', double: 'Double', triple: 'Triple', dormitory: 'Dormitory' };

export default function VacancyPage() {
  const { ownerId } = useParams();
  const [selected, setSelected] = useState(null); // propertyId for enquiry
  const [form, setForm] = useState({ name: '', mobile: '', email: '', message: '' });
  const [submitted, setSubmitted] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['public-vacancies', ownerId],
    queryFn: () => api.get(`/public/vacancies/${ownerId}`).then((r) => r.data.data),
  });

  const submit = useMutation({
    mutationFn: () => api.post('/public/leads', { propertyId: selected, ...form }),
    onSuccess: () => { setSubmitted(true); setForm({ name: '', mobile: '', email: '', message: '' }); },
  });

  if (isLoading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (isError || !data) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <p className="text-slate-500">Page not found or no vacancies available.</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-indigo-600 text-white py-10 px-4 text-center">
        <h1 className="text-3xl font-extrabold">{data.owner}</h1>
        <p className="mt-2 text-indigo-200 text-sm">Available Rooms & Beds</p>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {data.properties.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center text-slate-400 shadow-sm">
            No vacancies available right now. Check back soon!
          </div>
        ) : (
          data.properties.map((p) => (
            <div key={p.propertyId} className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="bg-indigo-50 px-6 py-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{p.name}</h2>
                  <p className="text-sm text-slate-500">{p.address}, {p.city}</p>
                </div>
                <span className="bg-green-100 text-green-700 text-sm font-bold px-3 py-1 rounded-full">
                  {p.totalVacant} Vacant
                </span>
              </div>

              {p.amenities?.length > 0 && (
                <div className="px-6 pt-3 flex flex-wrap gap-2">
                  {p.amenities.map((a) => (
                    <span key={a} className="bg-slate-100 text-slate-600 text-xs font-medium px-2 py-1 rounded-full">{a}</span>
                  ))}
                </div>
              )}

              <div className="px-6 py-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {p.vacantBeds.map((b, i) => (
                  <div key={i} className="border border-slate-100 rounded-xl p-3 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">Room {b.roomNumber} — {b.bedLabel}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {TYPE_LABEL[b.type]} {b.attachedBath ? '· Attached Bath' : ''} {b.hasAC ? '· AC' : ''}
                      </p>
                    </div>
                    <span className="text-indigo-600 font-bold text-sm">₹{b.rent.toLocaleString('en-IN')}/mo</span>
                  </div>
                ))}
              </div>

              <div className="px-6 pb-5">
                <button
                  onClick={() => { setSelected(p.propertyId); setSubmitted(false); }}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-sm transition"
                >
                  Enquire About {p.name}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Enquiry modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
            {submitted ? (
              <div className="text-center py-6">
                <div className="text-4xl mb-3">🎉</div>
                <h3 className="text-xl font-bold text-slate-900">Enquiry Sent!</h3>
                <p className="text-slate-500 text-sm mt-2">The owner will contact you shortly.</p>
                <button onClick={() => setSelected(null)} className="mt-5 bg-indigo-600 text-white font-bold px-6 py-2.5 rounded-xl text-sm">
                  Close
                </button>
              </div>
            ) : (
              <>
                <h3 className="text-lg font-bold text-slate-900 mb-4">Send Enquiry</h3>
                <div className="space-y-3">
                  <input
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    placeholder="Your Name *"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                  <input
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    placeholder="Mobile Number *"
                    value={form.mobile}
                    onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                  />
                  <input
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    placeholder="Email (optional)"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                  <textarea
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                    placeholder="Message (optional)"
                    rows={3}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                  />
                </div>
                {submit.isError && (
                  <p className="text-red-500 text-xs mt-2">{submit.error?.response?.data?.message || 'Something went wrong'}</p>
                )}
                <div className="flex gap-3 mt-4">
                  <button onClick={() => setSelected(null)} className="flex-1 border border-slate-200 text-slate-600 font-semibold py-2.5 rounded-xl text-sm">
                    Cancel
                  </button>
                  <button
                    onClick={() => { if (form.name && form.mobile) submit.mutate(); }}
                    disabled={submit.isPending || !form.name || !form.mobile}
                    className="flex-1 bg-indigo-600 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-sm"
                  >
                    {submit.isPending ? 'Sending…' : 'Send Enquiry'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
