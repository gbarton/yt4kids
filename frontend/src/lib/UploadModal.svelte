<script lang="ts">
  import { uploadVideo, type UploadProgress } from './SecureFetch';

  type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

  let {
    videoId,
    authorId,
    authorName,
    authorThumbnails,
    title,
    onClose,
    onUploadComplete,
  }: {
    videoId: string;
    authorId: string;
    authorName: string;
    authorThumbnails: { width: number; height: number; url: string; size: string }[];
    title: string;
    onClose: () => void;
    onUploadComplete: () => void;
  } = $props();

  let file: File | null = $state(null);
  let isDragging = $state(false);
  let status: UploadStatus = $state('idle');
  let progress: UploadProgress = $state({ loaded: 0, total: 0, percent: 0 });
  let errorMessage = $state('');

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    isDragging = true;
  }

  function handleDragLeave(e: DragEvent) {
    e.preventDefault();
    isDragging = false;
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    isDragging = false;
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      setFile(files[0]);
    }
  }

  function handleFileSelect(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      setFile(input.files[0]);
    }
  }

  function setFile(f: File) {
    file = f;
    status = 'idle';
    errorMessage = '';
  }

  async function handleUpload() {
    if (!file) return;

    status = 'uploading';
    progress = { loaded: 0, total: file.size, percent: 0 };
    errorMessage = '';

    const formData = new FormData();
    formData.append('videoId', videoId);
    formData.append('authorId', authorId);
    formData.append('authorName', authorName);
    formData.append('file', file);
    formData.append('authorThumbnails', JSON.stringify(authorThumbnails));

    try {
      const resp = await uploadVideo('/api/ext/upload', formData, (p) => {
        progress = p;
      });

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(text || `Upload failed with status ${resp.status}`);
      }

      status = 'success';
      setTimeout(() => {
        onUploadComplete();
      }, 1000);
    } catch (err: any) {
      status = 'error';
      errorMessage = err.message || 'Upload failed';
    }
  }

  function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
</script>

<!-- Backdrop -->
<div
  class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
  onclick={(e) => { if (e.target === e.currentTarget) onClose(); }}
>
  <!-- Modal -->
  <div class="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-lg font-semibold text-gray-800">Upload Video</h2>
      <button
        class="text-gray-400 hover:text-gray-600 cursor-pointer"
        onclick={onClose}
        aria-label="Close modal"
      >
        <i class="fas fa-times"></i>
      </button>
    </div>

    <p class="text-sm text-gray-600 mb-4 truncate" title={title}>{title}</p>

    {#if status === 'idle'}
      <!-- Drop Zone -->
      <div
        class="border-2 border-dashed rounded-lg p-8 text-center transition-colors {isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-gray-400'}"
        ondragover={handleDragOver}
        ondragleave={handleDragLeave}
        ondrop={handleDrop}
      >
        {#if file}
          <div class="flex flex-col items-center">
            <i class="fas fa-file-video text-3xl text-indigo-500 mb-2"></i>
            <p class="text-sm font-medium text-gray-700">{file.name}</p>
            <p class="text-xs text-gray-500">{formatBytes(file.size)}</p>
            <button
              class="mt-2 text-xs text-red-500 hover:text-red-700 cursor-pointer"
              onclick={() => { file = null; }}
            >
              Remove
            </button>
          </div>
        {:else}
          <i class="fas fa-cloud-upload-alt text-4xl text-gray-400 mb-2"></i>
          <p class="text-gray-600">Drag & drop a video file here</p>
          <p class="text-xs text-gray-400 mt-1">or</p>
          <label class="mt-2 inline-block bg-indigo-500 hover:bg-indigo-600 text-white text-sm px-4 py-2 rounded cursor-pointer">
            Browse Files
            <input
              type="file"
              accept="video/*"
              class="hidden"
              onchange={handleFileSelect}
            />
          </label>
        {/if}
      </div>

      <!-- Upload Button -->
      <div class="mt-4 flex justify-end">
        <button
          class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={!file}
          onclick={handleUpload}
        >
          <i class="fas fa-upload mr-1"></i> Upload
        </button>
      </div>
    {:else if status === 'uploading'}
      <!-- Progress -->
      <div class="py-4">
        <div class="flex justify-between text-sm text-gray-600 mb-1">
          <span>Uploading...</span>
          <span>{progress.percent}%</span>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-3">
          <div
            class="bg-indigo-500 h-3 rounded-full transition-all duration-200"
            style="width: {progress.percent}%"
          ></div>
        </div>
        <p class="text-xs text-gray-500 mt-2">
          {formatBytes(progress.loaded)} / {formatBytes(progress.total)}
        </p>
      </div>
    {:else if status === 'success'}
      <!-- Success -->
      <div class="py-8 text-center">
        <i class="fas fa-check-circle text-4xl text-green-500 mb-2"></i>
        <p class="text-gray-700 font-medium">Video uploaded successfully!</p>
      </div>
    {:else if status === 'error'}
      <!-- Error -->
      <div class="py-4">
        <div class="flex items-center text-red-500 mb-2">
          <i class="fas fa-exclamation-circle mr-2"></i>
          <span class="font-medium">Upload failed</span>
        </div>
        <p class="text-sm text-gray-600 bg-gray-100 p-2 rounded">{errorMessage}</p>
        <div class="mt-4 flex justify-end space-x-2">
          <button
            class="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded cursor-pointer"
            onclick={() => { status = 'idle'; file = null; }}
          >
            Try Again
          </button>
          <button
            class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded cursor-pointer"
            onclick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    {/if}
  </div>
</div>
