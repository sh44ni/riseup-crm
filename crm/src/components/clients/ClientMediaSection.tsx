import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  Image as ImageIcon,
  Video,
  UploadCloud,
  Plus,
  Play,
  Trash2,
  Download,
  X,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Clock,
  User,
  FileText,
  Loader2,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { ClientMediaItem } from '@/types/client360Types';
import { CrmModal } from '@/components/common/CrmModal';

interface ClientMediaSectionProps {
  clientId: string;
  clientName: string;
  media: ClientMediaItem[];
  onUploadMedia: (files: File[]) => Promise<void>;
  onDeleteMedia: (mediaId: string) => Promise<void>;
  isFullTab?: boolean;
}

export function ClientMediaSection({
  clientId: _clientId,
  clientName,
  media,
  onUploadMedia,
  onDeleteMedia,
  isFullTab = false,
}: ClientMediaSectionProps) {
  const [filter, setFilter] = useState<'all' | 'photo' | 'video'>('all');
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<ClientMediaItem | null>(null);
  const [deletingMediaId, setDeletingMediaId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const photos = useMemo(() => media.filter((m) => m.mediaType === 'photo'), [media]);
  const videos = useMemo(() => media.filter((m) => m.mediaType === 'video'), [media]);

  const filteredMedia = useMemo(() => {
    if (filter === 'photo') return photos;
    if (filter === 'video') return videos;
    return media;
  }, [filter, photos, videos, media]);

  // Handle files selection
  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const filesArray = Array.from(fileList);
    setUploadError(null);
    setIsUploading(true);
    try {
      await onUploadMedia(filesArray);
    } catch (err: any) {
      setUploadError(err?.message || 'Failed to upload media files.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Drag and Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (dropZoneRef.current && !dropZoneRef.current.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await handleFiles(e.dataTransfer.files);
    }
  };

  // Delete media item
  const confirmDelete = async () => {
    if (!deletingMediaId) return;
    setIsDeleting(true);
    try {
      await onDeleteMedia(deletingMediaId);
      setDeletingMediaId(null);
    } catch {
      // Handled silently or toast
    } finally {
      setIsDeleting(false);
    }
  };

  // Lightbox keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedPhotoIndex !== null) {
        if (e.key === 'Escape') setSelectedPhotoIndex(null);
        if (e.key === 'ArrowLeft') {
          setSelectedPhotoIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : photos.length - 1));
        }
        if (e.key === 'ArrowRight') {
          setSelectedPhotoIndex((prev) => (prev !== null && prev < photos.length - 1 ? prev + 1 : 0));
        }
      }
      if (selectedVideo !== null && e.key === 'Escape') {
        setSelectedVideo(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPhotoIndex, photos.length, selectedVideo]);

  const activePhoto = selectedPhotoIndex !== null ? photos[selectedPhotoIndex] : null;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Recently';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return 'Recently';
    }
  };

  return (
    <div
      ref={dropZoneRef}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`light-glass-card rounded-2xl p-5 space-y-4 relative transition-all ${
        isDragging
          ? 'ring-4 ring-sky-400/80 border-sky-400 bg-sky-50/60 dark:bg-sky-950/30'
          : ''
      }`}
    >
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => handleFiles(e.target.files)}
        multiple
        accept="image/*,video/*"
        className="hidden"
      />

      {/* Drag Overlay Hint */}
      {isDragging && (
        <div className="absolute inset-0 z-30 rounded-2xl bg-sky-500/10 backdrop-blur-xs flex flex-col items-center justify-center border-2 border-dashed border-sky-500 pointer-events-none">
          <UploadCloud size={48} className="text-sky-600 dark:text-sky-400 animate-bounce mb-2" />
          <p className="font-extrabold text-sm text-sky-800 dark:text-sky-200">Drop photos or videos to upload</p>
        </div>
      )}

      {/* Header matching CRM specifications */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-500/10 border border-sky-100 dark:border-sky-500/20 flex items-center justify-center text-[#2F9FE3]">
            <ImageIcon size={16} />
          </div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white tracking-tight">
              Photos & Videos
            </h3>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {media.length} {media.length === 1 ? 'file' : 'files'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Upload Button */}
          <button
            type="button"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#0284C7] dark:bg-sky-600 hover:bg-[#0369a1] dark:hover:bg-sky-500 text-white text-xs font-bold shadow-xs hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
          >
            {isUploading ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <Plus size={13} className="stroke-[2.5]" />
                <span>Add Photos / Videos</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Upload Error Banner if any */}
      {uploadError && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-xs text-rose-800 dark:text-rose-300 font-semibold">
          <div className="flex items-center gap-2">
            <AlertTriangle size={15} className="shrink-0 text-rose-600" />
            <span>{uploadError}</span>
          </div>
          <button onClick={() => setUploadError(null)} className="text-rose-500 hover:text-rose-700">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Filter Tabs when files exist */}
      {media.length > 0 && (
        <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
          <div className="flex items-center gap-1.5 bg-slate-100/80 dark:bg-slate-800/80 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                filter === 'all'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All ({media.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('photo')}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
                filter === 'photo'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ImageIcon size={12} />
              <span>Photos ({photos.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilter('video')}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
                filter === 'video'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Video size={12} />
              <span>Videos ({videos.length})</span>
            </button>
          </div>

          <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
            Drag files directly onto this card to add more
          </span>
        </div>
      )}

      {/* EMPTY STATE (Matching screenshot layout) */}
      {media.length === 0 ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-sky-200 dark:border-sky-500/30 rounded-2xl bg-sky-50/30 dark:bg-sky-950/20 py-10 px-4 flex flex-col items-center justify-center text-center cursor-pointer hover:border-sky-400 dark:hover:border-sky-400 hover:bg-sky-50/60 dark:hover:bg-sky-950/40 transition-all group select-none"
        >
          <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-sky-100 dark:border-white/10 flex items-center justify-center text-sky-600 dark:text-sky-400 mb-3 group-hover:scale-110 transition-transform">
            <UploadCloud size={24} className="stroke-[2.2]" />
          </div>
          <h4 className="font-extrabold text-sm text-slate-900 dark:text-white tracking-tight mb-1">
            No photos or videos added yet
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-3">
            Drop files here or click <strong className="text-sky-600 dark:text-sky-400">Add Photos / Videos</strong> to archive media
          </p>
          <div className="text-[11px] text-slate-400 dark:text-slate-500 font-medium pt-3 border-t border-sky-100 dark:border-white/5 w-full max-w-md">
            Roof conditions, inspection videos, and before / after photos • Client media
          </div>
        </div>
      ) : filteredMedia.length === 0 ? (
        <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500 italic">
          No {filter === 'photo' ? 'photos' : 'videos'} found for this client.
        </div>
      ) : (
        /* MEDIA GRID */
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5 pt-1">
          {filteredMedia.map((item) => {
            const isVid = item.mediaType === 'video';
            const photoIdx = !isVid ? photos.findIndex((p) => p.id === item.id) : -1;

            return (
              <div
                key={item.id}
                className="group relative rounded-xl overflow-hidden bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 shadow-2xs hover:shadow-md hover:border-slate-300 dark:hover:border-white/20 transition-all flex flex-col"
              >
                {/* Media Thumbnail Container */}
                <div
                  onClick={() => {
                    if (isVid) {
                      setSelectedVideo(item);
                    } else if (photoIdx !== -1) {
                      setSelectedPhotoIndex(photoIdx);
                    }
                  }}
                  className="relative aspect-4/3 w-full bg-slate-950 overflow-hidden cursor-pointer flex items-center justify-center"
                >
                  {isVid ? (
                    <>
                      <video
                        src={item.url}
                        preload="metadata"
                        className="w-full h-full object-cover opacity-80 group-hover:opacity-90 group-hover:scale-105 transition-all duration-300"
                      />
                      {/* Play Button Overlay */}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/20 transition-colors">
                        <div className="w-10 h-10 rounded-full bg-white/90 dark:bg-slate-800/90 text-slate-900 dark:text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                          <Play size={18} className="fill-current ml-0.5 text-sky-600 dark:text-sky-400" />
                        </div>
                      </div>
                    </>
                  ) : (
                    <img
                      src={item.url}
                      alt={item.name}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  )}

                  {/* Top Badges */}
                  <div className="absolute top-2 left-2 flex items-center gap-1 pointer-events-none">
                    <span
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider shadow-sm ${
                        isVid
                          ? 'bg-purple-600 text-white'
                          : 'bg-sky-600 text-white'
                      }`}
                    >
                      {isVid ? <Video size={9} /> : <ImageIcon size={9} />}
                      <span>{isVid ? 'VIDEO' : 'PHOTO'}</span>
                    </span>
                  </div>

                  {item.fileSize && (
                    <div className="absolute top-2 right-2 pointer-events-none">
                      <span className="px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-white text-[9px] font-bold shadow-sm">
                        {item.fileSize}
                      </span>
                    </div>
                  )}

                  {/* Hover Actions Bar */}
                  <div className="absolute bottom-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isVid) setSelectedVideo(item);
                        else if (photoIdx !== -1) setSelectedPhotoIndex(photoIdx);
                      }}
                      title="Expand View"
                      className="p-1.5 rounded-lg bg-black/70 hover:bg-black text-white transition-colors cursor-pointer"
                    >
                      <Maximize2 size={12} />
                    </button>
                    <a
                      href={item.url}
                      download={item.name}
                      onClick={(e) => e.stopPropagation()}
                      title="Download file"
                      className="p-1.5 rounded-lg bg-black/70 hover:bg-black text-white transition-colors cursor-pointer"
                    >
                      <Download size={12} />
                    </a>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletingMediaId(item.id);
                      }}
                      title="Delete from client record"
                      className="p-1.5 rounded-lg bg-rose-600/90 hover:bg-rose-600 text-white transition-colors cursor-pointer"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                {/* Metadata Footer */}
                <div className="p-2.5 space-y-1 flex-1 flex flex-col justify-between">
                  <div
                    className="font-bold text-xs text-slate-900 dark:text-white truncate"
                    title={item.name}
                  >
                    {item.name}
                  </div>

                  <div className="flex flex-col gap-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1 truncate">
                      <User size={10} className="shrink-0 text-slate-400" />
                      <span className="truncate">By <strong>{item.uploadedBy || 'Staff'}</strong></span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-400 dark:text-slate-500">
                      <Clock size={10} className="shrink-0" />
                      <span>{formatDate(item.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* PHOTO VIEWER MODAL */}
      <CrmModal
        isOpen={!!activePhoto}
        onClose={() => setSelectedPhotoIndex(null)}
        title={activePhoto?.name || 'Photo'}
        subtitle={
          activePhoto
            ? `${clientName} • Photo ${(selectedPhotoIndex ?? 0) + 1} of ${photos.length}`
            : undefined
        }
        badge={{ label: 'Photo', variant: 'sky' }}
        icon={<ImageIcon size={18} />}
        maxWidth="4xl"
        footer={
          activePhoto ? (
            <div className="flex flex-wrap items-center justify-between gap-3 w-full">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <User size={12} /> Uploaded by{' '}
                  <strong className="text-slate-700 dark:text-slate-200">{activePhoto.uploadedBy || 'Staff'}</strong>
                </span>
                <span className="flex items-center gap-1">
                  <Clock size={12} /> {formatDate(activePhoto.createdAt)}
                </span>
                {activePhoto.fileSize && <span>{activePhoto.fileSize}</span>}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setDeletingMediaId(activePhoto.id);
                    setSelectedPhotoIndex(null);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold transition-colors cursor-pointer"
                >
                  <Trash2 size={13} />
                  <span>Delete</span>
                </button>
                <a
                  href={activePhoto.url}
                  download={activePhoto.name}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#0284C7] dark:bg-sky-600 hover:bg-[#0369a1] dark:hover:bg-sky-500 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                >
                  <Download size={13} />
                  <span>Download</span>
                </a>
                <button
                  type="button"
                  onClick={() => setSelectedPhotoIndex(null)}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          ) : undefined
        }
      >
        {activePhoto && (
          <div className="relative p-4 sm:p-5 bg-slate-100/70 dark:bg-slate-950/50 flex items-center justify-center min-h-[240px]">
            {photos.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  setSelectedPhotoIndex((prev) =>
                    prev !== null && prev > 0 ? prev - 1 : photos.length - 1
                  )
                }
                className="absolute left-3 z-10 p-2 rounded-full bg-white/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-md border border-slate-200/80 dark:border-white/10 transition-all cursor-pointer"
                title="Previous photo"
              >
                <ChevronLeft size={18} />
              </button>
            )}

            <img
              src={activePhoto.url}
              alt={activePhoto.name}
              className="max-h-[65vh] max-w-full w-auto object-contain rounded-xl shadow-lg"
            />

            {photos.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  setSelectedPhotoIndex((prev) =>
                    prev !== null && prev < photos.length - 1 ? prev + 1 : 0
                  )
                }
                className="absolute right-3 z-10 p-2 rounded-full bg-white/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-md border border-slate-200/80 dark:border-white/10 transition-all cursor-pointer"
                title="Next photo"
              >
                <ChevronRight size={18} />
              </button>
            )}
          </div>
        )}
      </CrmModal>

      {/* VIDEO PLAYBACK MODAL */}
      <CrmModal
        isOpen={!!selectedVideo}
        onClose={() => setSelectedVideo(null)}
        title={selectedVideo?.name || 'Video'}
        subtitle={selectedVideo ? clientName : undefined}
        badge={{ label: 'Video', variant: 'purple' }}
        icon={<Video size={18} />}
        maxWidth="4xl"
        footer={
          selectedVideo ? (
            <div className="flex flex-wrap items-center justify-between gap-3 w-full">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <User size={12} /> Uploaded by{' '}
                  <strong className="text-slate-700 dark:text-slate-200">{selectedVideo.uploadedBy || 'Staff'}</strong>
                </span>
                <span className="flex items-center gap-1">
                  <Clock size={12} /> {formatDate(selectedVideo.createdAt)}
                </span>
                {selectedVideo.fileSize && <span>{selectedVideo.fileSize}</span>}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setDeletingMediaId(selectedVideo.id);
                    setSelectedVideo(null);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold transition-colors cursor-pointer"
                >
                  <Trash2 size={13} />
                  <span>Delete</span>
                </button>
                <a
                  href={selectedVideo.url}
                  download={selectedVideo.name}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#0284C7] dark:bg-sky-600 hover:bg-[#0369a1] dark:hover:bg-sky-500 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                >
                  <Download size={13} />
                  <span>Download</span>
                </a>
                <button
                  type="button"
                  onClick={() => setSelectedVideo(null)}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          ) : undefined
        }
      >
        {selectedVideo && (
          <div className="p-4 sm:p-5 bg-slate-100/70 dark:bg-slate-950/50">
            <video
              key={selectedVideo.id}
              src={selectedVideo.url}
              controls
              autoPlay
              className="w-full max-h-[65vh] rounded-xl bg-black shadow-lg"
            >
              Your browser does not support video playback.
            </video>
          </div>
        )}
      </CrmModal>

      {/* DELETE CONFIRMATION MODAL */}
      <CrmModal
        isOpen={!!deletingMediaId}
        onClose={() => !isDeleting && setDeletingMediaId(null)}
        title="Delete Media File?"
        subtitle="This permanently removes the file"
        badge={{ label: 'Permanent', variant: 'rose' }}
        icon={<Trash2 size={18} />}
        iconGradient="from-rose-600 to-rose-500"
        maxWidth="sm"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => setDeletingMediaId(null)}
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isDeleting}
              onClick={confirmDelete}
              className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-60"
            >
              {isDeleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
              <span>{isDeleting ? 'Deleting...' : 'Delete'}</span>
            </button>
          </div>
        }
      >
        <p className="px-6 py-5 text-xs text-slate-600 dark:text-slate-300">
          Are you sure you want to remove this file from <strong>{clientName}</strong>&apos;s record?
        </p>
      </CrmModal>
    </div>
  );
}

export default ClientMediaSection;
