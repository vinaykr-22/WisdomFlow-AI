import { useEffect, useState } from 'react';
import api from '../api/client';
import { FileText, Trash2, UploadCloud, File, CheckCircle2, Loader2, Clock } from 'lucide-react';

interface Doc {
  id: string;
  title: string;
  original_filename: string;
  file_type: string;
  file_size: number;
  processing_status: string;
  created_at: string;
}

export default function Documents() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const loadDocs = async () => {
    const { data } = await api.get('/documents');
    setDocs(data.documents);
  };

  useEffect(() => { loadDocs(); }, []);

  const handleUpload = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    const form = new FormData();
    form.append('file', file);
    try {
      await api.post('/documents/upload', form);
      await loadDocs();
    } catch (e: any) {
      alert(e.response?.data?.detail || e.message || 'Upload failed');
    }
    setUploading(false);
  };

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleUpload(e.target.files[0]);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUpload(e.dataTransfer.files[0]);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    await api.delete(`/documents/${id}`);
    setDocs((prev) => prev.filter((d) => d.id !== id));
  };

  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return <FileText className="text-red-500" size={24} />;
    if (type.includes('word') || type.includes('docx')) return <FileText className="text-blue-500" size={24} />;
    if (type.includes('text') || type.includes('txt')) return <File className="text-slate-500" size={24} />;
    return <File className="text-slate-400" size={24} />;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Header Area */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">My Documents</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Manage your learning resources and knowledge base.</p>
        </div>
      </div>

      {/* Upload Area */}
      <div 
        className={`relative border-2 border-dashed rounded-2xl p-10 text-center transition-all duration-300 ${
          dragActive ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-blue-400 dark:hover:border-blue-600 hover:bg-slate-50 dark:hover:bg-slate-800/50'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center justify-center pointer-events-none">
          {uploading ? (
            <Loader2 className="animate-spin text-blue-500 mb-4" size={40} />
          ) : (
            <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-full mb-4 text-blue-600 dark:text-blue-400">
              <UploadCloud size={28} />
            </div>
          )}
          
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-1">
            {uploading ? 'Uploading your document...' : 'Click to upload or drag and drop'}
          </h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
            Supports PDF, DOCX, PPTX, and TXT (Max 50MB)
          </p>
        </div>
        
        <input 
          type="file" 
          accept=".pdf,.docx,.pptx,.txt" 
          onChange={onFileInput} 
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={uploading}
        />
      </div>

      {/* Documents List */}
      <div>
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Uploaded Files ({docs.length})</h2>
        
        {docs.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-12 text-center shadow-sm">
            <div className="mx-auto w-16 h-16 bg-slate-50 dark:bg-slate-800 text-slate-300 dark:text-slate-600 rounded-full flex items-center justify-center mb-4">
              <File size={32} />
            </div>
            <p className="text-slate-600 dark:text-slate-400 font-medium">No documents yet</p>
            <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">Upload your first document above to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {docs.map((doc) => (
              <div key={doc.id} className="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 shadow-sm hover:shadow-md hover:border-slate-200 dark:hover:border-slate-700 transition-all duration-200">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-xl">
                    {getFileIcon(doc.file_type)}
                  </div>
                  <button 
                    onClick={() => handleDelete(doc.id)} 
                    className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg opacity-0 group-hover:opacity-100 transition-all focus:opacity-100 cursor-pointer"
                    title="Delete document"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                
                <h3 className="font-semibold text-slate-800 dark:text-slate-100 truncate mb-1" title={doc.title}>
                  {doc.title}
                </h3>
                
                <div className="flex items-center justify-between mt-4 text-xs font-medium">
                  <span className="text-slate-400 dark:text-slate-500 flex items-center gap-1">
                    {(doc.file_size / 1024 / 1024).toFixed(2)} MB
                  </span>
                  
                  <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full ${
                    doc.processing_status === 'uploaded' 
                      ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50' 
                      : doc.processing_status === 'failed'
                      ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/50'
                      : 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/50'
                  }`}>
                    {doc.processing_status === 'uploaded' ? <CheckCircle2 size={12} /> : 
                     doc.processing_status === 'failed' ? null : <Clock size={12} />}
                    {doc.processing_status.charAt(0).toUpperCase() + doc.processing_status.slice(1)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
