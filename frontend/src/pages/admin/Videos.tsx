import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Plus, Edit3, Trash2, Eye, Film, Loader2, X, Play, Video } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { Select } from '@/components/ui/Select';
import { Loader } from '@/components/ui/Loader';
import api from '@/lib/axios';
import toast from 'react-hot-toast';
import { VideoPlayer } from '@/components/video/VideoPlayer';

const ENTITY_TYPES = [
  { label: 'School', value: 'school' },
  { label: 'Program', value: 'program' },
  { label: 'Course', value: 'course' },
];

export default function AdminVideos() {
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const [form, setForm] = useState({
    entity_type: 'school',
    entity_id: '',
    title: '',
    description: '',
    video_url: '',
    thumbnail_url: '',
    duration: 0,
    provider: 'html5',
  });

  async function fetchVideos() {
    setLoading(true);
    try {
      const { data } = await api.get('/showcase-videos/all');
      setVideos(data.data || []);
    } catch {
      toast.error('Failed to load videos');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchVideos(); }, []);

  function openCreate() {
    setEditing(null);
    setForm({ entity_type: 'school', entity_id: '', title: '', description: '', video_url: '', thumbnail_url: '', duration: 0, provider: 'html5' });
    setShowForm(true);
  }

  function openEdit(video: any) {
    setEditing(video);
    setForm({
      entity_type: video.entity_type,
      entity_id: video.entity_id,
      title: video.title,
      description: video.description || '',
      video_url: video.video_url,
      thumbnail_url: video.thumbnail_url || '',
      duration: video.duration || 0,
      provider: video.provider || 'html5',
    });
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.title || !form.video_url) {
      toast.error('Title and video URL are required');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/showcase-videos/${editing.id}`, form);
        toast.success('Video updated');
      } else {
        await api.post('/showcase-videos', form);
        toast.success('Video created');
      }
      setShowForm(false);
      fetchVideos();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save video');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this video?')) return;
    setDeleting(id);
    try {
      await api.delete(`/showcase-videos/${id}`);
      toast.success('Video deleted');
      setVideos(prev => prev.filter(v => v.id !== id));
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to delete');
    } finally {
      setDeleting(null);
    }
  }

  async function loadStats(id: string) {
    setStatsLoading(true);
    setStats(null);
    try {
      const { data } = await api.get(`/showcase-videos/${id}/stats`);
      setStats(data.data);
    } catch {
      toast.error('Failed to load stats');
    } finally {
      setStatsLoading(false);
    }
  }

  const filtered = videos.filter(v =>
    v.title?.toLowerCase().includes(search.toLowerCase()) ||
    v.entity_type?.includes(search.toLowerCase())
  );

  const entityLabels: Record<string, string> = { school: 'School', program: 'Program', course: 'Course' };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Showcase Videos</h1>
          <p className="text-gray-400 text-sm mt-1">Manage videos for schools, programs, and courses</p>
        </div>
        <Button onClick={openCreate} className="flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Video
        </Button>
      </div>

      <GlassCard className="p-4 mb-6">
        <div className="flex items-center gap-3">
          <Search className="w-5 h-5 text-gray-400 shrink-0" />
          <Input
            placeholder="Search by title or type..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1"
          />
        </div>
      </GlassCard>

      {loading ? (
        <div className="flex justify-center py-20"><Loader size="lg" text="Loading videos..." /></div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Video className="w-8 h-8" />}
          title="No videos yet"
          description="Add a showcase video for a school, program, or course."
          action={{ label: 'Add Video', onClick: openCreate }}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map(video => (
            <GlassCard key={video.id} className="p-4">
              <div className="flex items-start gap-4">
                <div className="w-32 h-20 rounded-lg bg-gray-800 shrink-0 flex items-center justify-center overflow-hidden cursor-pointer" onClick={() => { setPreviewId(video.id); loadStats(video.id); }}>
                  {video.thumbnail_url ? (
                    <img src={video.thumbnail_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Film className="w-8 h-8 text-primary-500/50" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-white font-medium truncate">{video.title}</h3>
                      <p className="text-gray-400 text-xs mt-1 line-clamp-1">{video.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="primary" size="sm">{entityLabels[video.entity_type] || video.entity_type}</Badge>
                        <Badge variant="default" size="sm">{video.provider}</Badge>
                        {video.views > 0 && (
                          <span className="text-xs text-gray-500">{video.views} views</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button size="sm" variant="ghost" onClick={() => setPreviewId(video.id)} disabled={!previewId || previewId === video.id}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => openEdit(video)}>
                        <Edit3 className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(video.id)} disabled={deleting === video.id}>
                        {deleting === video.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {stats && previewId === video.id && (
                <div className="mt-4 pt-3 border-t border-gray-800 grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Total Views</p>
                    <p className="text-lg font-bold text-white">{stats.total_views}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Unique</p>
                    <p className="text-lg font-bold text-white">{stats.unique_viewers}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Completions</p>
                    <p className="text-lg font-bold text-white">{stats.completions}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Completion Rate</p>
                    <p className="text-lg font-bold text-white">{stats.completion_rate}%</p>
                  </div>
                </div>
              )}
            </GlassCard>
          ))}
        </div>
      )}

      {previewId && (
        <VideoPlayer
          videoUrl={videos.find(v => v.id === previewId)?.video_url || ''}
          provider={videos.find(v => v.id === previewId)?.provider}
          thumbnailUrl={videos.find(v => v.id === previewId)?.thumbnail_url}
          title={videos.find(v => v.id === previewId)?.title}
          videoId={previewId}
          isOpen={!!previewId}
          onClose={() => { setPreviewId(null); setStats(null); }}
        />
      )}

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editing ? 'Edit Video' : 'Add Video'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Entity Type"
              value={form.entity_type}
              onChange={e => setForm(f => ({ ...f, entity_type: e.target.value }))}
              options={ENTITY_TYPES}
            />
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Entity ID</label>
              <Input
                placeholder="UUID of the school/program/course"
                value={form.entity_id}
                onChange={e => setForm(f => ({ ...f, entity_id: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Title</label>
            <Input
              placeholder="Video title"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
            <textarea
              className="w-full rounded-xl border border-gray-700 bg-gray-800/50 px-4 py-2.5 text-white placeholder-gray-500 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none resize-none"
              rows={2}
              placeholder="Optional description"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Video URL</label>
              <Input
                placeholder="https://..."
                value={form.video_url}
                onChange={e => setForm(f => ({ ...f, video_url: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Thumbnail URL</label>
              <Input
                placeholder="https://..."
                value={form.thumbnail_url}
                onChange={e => setForm(f => ({ ...f, thumbnail_url: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Provider"
              value={form.provider}
              onChange={e => setForm(f => ({ ...f, provider: e.target.value }))}
              options={[
                { label: 'HTML5', value: 'html5' },
                { label: 'YouTube', value: 'youtube' },
                { label: 'Vimeo', value: 'vimeo' },
              ]}
            />
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Duration (seconds)</label>
              <Input
                type="number"
                min={0}
                value={form.duration.toString()}
                onChange={e => setForm(f => ({ ...f, duration: parseInt(e.target.value) || 0 }))}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editing ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}
