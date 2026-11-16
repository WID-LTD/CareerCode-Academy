import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, User, BookOpen, Loader2, Star, Globe, Video, CheckCircle2, XCircle, ChevronRight, Search } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Tabs } from '@/components/ui/Tabs';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import api from '@/lib/axios';
import toast from 'react-hot-toast';

const studentZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

function fmt(date: string, timeZone: string) {
  if (!date) return '—';
  try {
    return new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone }).format(new Date(date));
  } catch { return new Date(date).toLocaleString(); }
}

function zoneLabel(zone: string) {
  return zone.replace(/_/g, ' ');
}

export default function StudentMentorship() {
  const confirm = useConfirm();
  const [tab, setTab] = useState('instructors');
  const [instructors, setInstructors] = useState<any[]>([]);
  const [slots, setSlots] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [profile, setProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [bookingSlot, setBookingSlot] = useState<any>(null);
  const [booking, setBooking] = useState(false);
  const [reschedule, setReschedule] = useState<any>(null);
  const [proposedStart, setProposedStart] = useState('');
  const [proposedEnd, setProposedEnd] = useState('');
  const [reason, setReason] = useState('');
  const [rescheduling, setRescheduling] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [i, s, b] = await Promise.all([
        api.get('/mentoring/instructors'),
        api.get('/mentoring/slots'),
        api.get('/mentoring/my-bookings'),
      ]);
      setInstructors(i.data.data || []);
      setSlots(s.data.data || []);
      setBookings(b.data.data || []);
    } catch { toast.error('Failed to load mentorship'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openProfile = async (id: string) => {
    setProfileLoading(true);
    setProfile({ id });
    try {
      const { data } = await api.get(`/mentoring/instructors/${id}`);
      setProfile(data.data);
    } catch { toast.error('Failed to load instructor'); setProfile(null); }
    finally { setProfileLoading(false); }
  };

  const book = async () => {
    if (!bookingSlot) return;
    setBooking(true);
    try {
      await api.post(`/mentoring/slots/${bookingSlot.id}/book`);
      toast.success('Session booked');
      setBookingSlot(null);
      await load();
      setTab('mine');
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Failed to book session'); }
    finally { setBooking(false); }
  };

  const cancel = async (slot: any) => {
    const ok = await confirm({ title: 'Cancel this session?', message: `Cancel your session with ${slot.instructor_name}?`, confirmLabel: 'Cancel session', destructive: true });
    if (!ok) return;
    try { await api.post(`/mentoring/slots/${slot.id}/cancel`); toast.success('Booking cancelled'); load(); }
    catch (e: any) { toast.error(e?.response?.data?.message || 'Failed to cancel'); }
  };

  const requestReschedule = async () => {
    if (!reschedule || !proposedStart || !proposedEnd) { toast.error('Choose a new start and end time'); return; }
    setRescheduling(true);
    try {
      await api.post(`/mentoring/slots/${reschedule.id}/reschedule`, {
        proposed_start_time: new Date(proposedStart).toISOString(),
        proposed_end_time: new Date(proposedEnd).toISOString(),
        reason,
      });
      toast.success('Reschedule requested');
      setReschedule(null); setProposedStart(''); setProposedEnd(''); setReason('');
      load();
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Failed to request reschedule'); }
    finally { setRescheduling(false); }
  };

  const filteredInstructors = useMemo(() => instructors.filter((i) => {
    const q = search.toLowerCase();
    return !q || i.name?.toLowerCase().includes(q) || i.headline?.toLowerCase().includes(q) || (i.course_titles || '').toLowerCase().includes(q);
  }), [instructors, search]);

  const upcoming = bookings.filter((b) => new Date(b.end_time).getTime() >= Date.now() && b.status === 'booked');
  const past = bookings.filter((b) => new Date(b.end_time).getTime() < Date.now() || ['completed', 'no_show', 'cancelled'].includes(b.status));

  if (loading) return <div className="py-20 grid place-items-center"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-primary-500">Mentorship</p>
        <h1 className="text-2xl sm:text-3xl font-bold">Learn with your instructors</h1>
        <p className="text-sm text-gray-500 mt-1">Mentoring is included with your active course access. Times are shown in {zoneLabel(studentZone)} and your instructor’s timezone.</p>
      </div>

      <Tabs
        tabs={[
          { key: 'instructors', label: `My instructors (${instructors.length})`, icon: User },
          { key: 'available', label: `Available sessions (${slots.length})`, icon: Calendar },
          { key: 'mine', label: `My bookings (${upcoming.length})`, icon: CheckCircle2 },
          { key: 'past', label: `Past (${past.length})`, icon: Clock },
        ]}
        activeKey={tab}
        onChange={setTab}
        variant="pills"
      />

      {tab === 'instructors' && (
        <div className="space-y-4">
          <Input placeholder="Search instructor, expertise or course" value={search} onChange={(e) => setSearch(e.target.value)} icon={<Search className="w-4 h-4" />} />
          {filteredInstructors.length === 0 ? (
            <GlassCard hover={false} className="p-10 text-center">
              <User className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="font-medium">No instructors available yet</p>
              <p className="text-sm text-gray-500 mt-1">Mentoring appears when you have an active trial or paid course and your instructor has published availability.</p>
            </GlassCard>
          ) : (
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredInstructors.map((i) => (
                <GlassCard key={i.id} hover={false} className="p-5">
                  <div className="flex items-start gap-3">
                    {i.avatar ? <img src={i.avatar} alt={i.name} className="w-12 h-12 rounded-full object-cover" /> : <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 grid place-items-center text-white font-bold">{i.name?.charAt(0)}</div>}
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold truncate">{i.name}</p>
                      <p className="text-xs text-gray-500 truncate">{i.headline || 'Instructor'}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                        <span className="flex items-center gap-1"><Star className="w-3 h-3 text-amber-500" />{Number(i.rating || 0).toFixed(1)} ({i.reviews || 0})</span>
                        <span className="flex items-center gap-1"><Globe className="w-3 h-3" />{zoneLabel(i.timezone || 'Africa/Lagos')}</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-3 line-clamp-2">{i.mentoring_bio || i.bio || 'Mentoring for your course.'}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {(i.topics || []).slice(0, 3).map((t: string) => <Badge key={t} variant="primary">{t}</Badge>)}
                    <Badge variant="success">{i.available_slots} slots</Badge>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-2 truncate">{i.course_titles}</p>
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => openProfile(i.id)}>View profile</Button>
                    <Button size="sm" className="flex-1" onClick={() => { const first = slots.find((s) => s.instructor_id === i.id); if (first) setBookingSlot(first); else openProfile(i.id); }}>Book session</Button>
                  </div>
                </GlassCard>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'available' && (
        <div className="space-y-3">
          {slots.length === 0 ? <Empty title="No published sessions right now" hint="Your instructor may still be preparing availability." /> : slots.map((slot) => (
            <GlassCard key={slot.id} hover={false} className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{slot.title}</p>
                  <p className="text-xs text-gray-500 mt-1">{slot.instructor_name} · {slot.course_title || 'General mentoring'}</p>
                  <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{fmt(slot.start_time, studentZone)} <span className="text-gray-400">({zoneLabel(studentZone)})</span></span>
                    <span className="flex items-center gap-1"><Globe className="w-3 h-3" />{fmt(slot.start_time, slot.timezone || 'Africa/Lagos')} <span className="text-gray-400">({zoneLabel(slot.timezone || 'Africa/Lagos')})</span></span>
                  </div>
                </div>
                <Button onClick={() => setBookingSlot(slot)}>Book session</Button>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {tab === 'mine' && (
        <div className="space-y-3">
          {upcoming.length === 0 ? <Empty title="No upcoming sessions" hint="Book a session from your instructors." /> : upcoming.map((slot) => (
            <GlassCard key={slot.id} hover={false} className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{slot.title}</p>
                  <p className="text-xs text-gray-500">{slot.instructor_name} · {slot.course_title || 'General mentoring'}</p>
                  <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
                    <span>{fmt(slot.start_time, studentZone)} ({zoneLabel(studentZone)})</span>
                    <span>{fmt(slot.start_time, slot.timezone || 'Africa/Lagos')} ({zoneLabel(slot.timezone || 'Africa/Lagos')})</span>
                  </div>
                  {slot.reschedule_status === 'requested' && <Badge variant="warning" className="mt-2">Reschedule requested</Badge>}
                  {slot.reschedule_status === 'approved' && <Badge variant="success" className="mt-2">Reschedule approved</Badge>}
                </div>
                <div className="flex flex-wrap gap-2">
                  {slot.meeting_url && <a href={slot.meeting_url} target="_blank" rel="noreferrer"><Button size="sm" variant="outline" icon={<Video className="w-3.5 h-3.5" />}>Join</Button></a>}
                  <Button size="sm" variant="outline" onClick={() => { setReschedule(slot); setProposedStart(slot.start_time?.slice(0,16) || ''); setProposedEnd(slot.end_time?.slice(0,16) || ''); }}>Reschedule</Button>
                  <Button size="sm" variant="ghost" onClick={() => cancel(slot)}>Cancel</Button>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {tab === 'past' && (
        <div className="space-y-3">
          {past.length === 0 ? <Empty title="No past sessions" /> : past.map((slot) => (
            <GlassCard key={slot.id} hover={false} className="p-4 opacity-80">
              <p className="font-medium">{slot.title}</p>
              <p className="text-xs text-gray-500">{slot.instructor_name} · {fmt(slot.start_time, studentZone)}</p>
              <Badge variant={slot.status === 'completed' ? 'success' : 'default'} className="mt-2">{slot.status.replace(/_/g, ' ')}</Badge>
            </GlassCard>
          ))}
        </div>
      )}

      <Modal isOpen={!!profile} onClose={() => setProfile(null)} title={profile?.instructor?.name || 'Instructor'} size="lg">
        {profileLoading ? <div className="py-12 grid place-items-center"><Loader2 className="w-6 h-6 animate-spin text-primary-500" /></div> : profile?.instructor ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              {profile.instructor.avatar ? <img src={profile.instructor.avatar} alt="" className="w-14 h-14 rounded-full object-cover" /> : <div className="w-14 h-14 rounded-full bg-primary-500/10 grid place-items-center text-xl font-bold text-primary-500">{profile.instructor.name?.charAt(0)}</div>}
              <div><p className="font-semibold">{profile.instructor.name}</p><p className="text-sm text-gray-500">{profile.instructor.headline}</p><p className="text-xs text-gray-400">{zoneLabel(profile.instructor.timezone || 'Africa/Lagos')}</p></div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{profile.instructor.mentoring_bio || profile.instructor.bio}</p>
            <div className="flex flex-wrap gap-1">{(profile.instructor.topics || []).map((t: string) => <Badge key={t} variant="primary">{t}</Badge>)}</div>
            <div>
              <h3 className="text-sm font-semibold mb-2">Shared courses</h3>
              <div className="flex flex-wrap gap-2">{(profile.courses || []).map((c: any) => <Badge key={c.id} variant="default">{c.title}</Badge>)}</div>
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-2">Available sessions</h3>
              {(profile.slots || []).length === 0 ? <p className="text-sm text-gray-400">No published sessions right now.</p> : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {profile.slots.map((slot: any) => (
                    <div key={slot.id} className="flex items-center justify-between gap-2 rounded-xl border border-gray-100 dark:border-gray-800 p-2.5">
                      <div><p className="text-sm">{fmt(slot.start_time, studentZone)}</p><p className="text-[11px] text-gray-400">{fmt(slot.start_time, slot.timezone || 'Africa/Lagos')} instructor time</p></div>
                      <Button size="sm" onClick={() => { setProfile(null); setBookingSlot(slot); }}>Book</Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : <Empty title="Instructor not available" />}
      </Modal>

      <Modal isOpen={!!bookingSlot} onClose={() => setBookingSlot(null)} title="Confirm mentoring session">
        {bookingSlot && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">You are booking a session with <strong>{bookingSlot.instructor_name}</strong>.</p>
            <div className="rounded-xl bg-gray-50 dark:bg-gray-800/50 p-3 text-sm space-y-1">
              <p>{fmt(bookingSlot.start_time, studentZone)} <span className="text-xs text-gray-400">({zoneLabel(studentZone)})</span></p>
              <p className="text-xs text-gray-500">{fmt(bookingSlot.start_time, bookingSlot.timezone || 'Africa/Lagos')} ({zoneLabel(bookingSlot.timezone || 'Africa/Lagos')})</p>
            </div>
            <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setBookingSlot(null)}>Cancel</Button><Button loading={booking} onClick={book}>Confirm booking</Button></div>
          </div>
        )}
      </Modal>

      <Modal isOpen={!!reschedule} onClose={() => setReschedule(null)} title="Request a new time">
        <div className="space-y-3">
          <Input label="New start" type="datetime-local" value={proposedStart} onChange={(e) => setProposedStart(e.target.value)} />
          <Input label="New end" type="datetime-local" value={proposedEnd} onChange={(e) => setProposedEnd(e.target.value)} />
          <Input label="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} />
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setReschedule(null)}>Cancel</Button><Button loading={rescheduling} onClick={requestReschedule}>Send request</Button></div>
        </div>
      </Modal>
    </motion.div>
  );
}

function Empty({ title, hint }: { title: string; hint?: string }) {
  return <GlassCard hover={false} className="p-10 text-center"><Calendar className="w-8 h-8 text-gray-300 mx-auto mb-2" /><p className="font-medium">{title}</p>{hint && <p className="text-sm text-gray-500 mt-1">{hint}</p>}</GlassCard>;
}
