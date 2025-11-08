export default {
    async fetch(request, env) {
        const { pathname } = new URL(request.url);
        const domain = env.DOMAIN;
        const DATABASE = env.DATABASE;
        const USERNAME = env.USERNAME;
        const PASSWORD = env.PASSWORD;
        const adminPath = env.ADMIN_PATH;
        const enableAuth = env.ENABLE_AUTH === 'true';
        const TG_BOT_TOKEN = env.TG_BOT_TOKEN;
        const TG_CHAT_ID = env.TG_CHAT_ID;
        const maxSizeMB = env.MAX_SIZE_MB ? parseInt(env.MAX_SIZE_MB, 10) : 20;
        const maxSize = maxSizeMB * 1024 * 1024;

        switch (pathname) {
            case '/':
                return await handleRootRequest(request, USERNAME, PASSWORD, enableAuth);
            case `/${adminPath}`:
                return await handleAdminRequest(DATABASE, request, USERNAME, PASSWORD);
            case '/upload':
                return request.method === 'POST' 
                    ? await handleUploadRequest(request, DATABASE, enableAuth, USERNAME, PASSWORD, domain, TG_BOT_TOKEN, TG_CHAT_ID, maxSize)
                    : new Response('Method Not Allowed', { status: 405 });
            case '/bing-images':
                return handleBingImagesRequest();
            case '/delete-images':
                return await handleDeleteImagesRequest(request, DATABASE, USERNAME, PASSWORD);
            case '/random':
                return await handleRandomRequest(request, DATABASE); // 新增随机图片路由
            default:
                return await handleImageRequest(request, DATABASE, TG_BOT_TOKEN);
        }
    }
};

function authenticate(request, USERNAME, PASSWORD) {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) return false;
    return isValidCredentials(authHeader, USERNAME, PASSWORD);
}

async function handleRootRequest(request, USERNAME, PASSWORD, enableAuth) {
  const cache = caches.default;
  const cacheKey = new Request(request.url);
  
  if (enableAuth) {
    if (!authenticate(request, USERNAME, PASSWORD)) {
      return new Response('Unauthorized', {
        status: 401,
        headers: { 'WWW-Authenticate': 'Basic realm="Admin"' }
      });
    }
  }

  const cachedResponse = await cache.match(cacheKey);
  if (cachedResponse) {
    return cachedResponse;
  }

  const response = new Response(`<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="Telegraph图床-基于Workers的图床服务">
    <meta name="keywords" content="Telegraph图床,Workers图床, Cloudflare, Workers,telegra.ph, 图床">
    <title>Telegraph图床-基于Workers的图床服务</title>
    <link rel="icon" href="https://p1.meituan.net/csc/c195ee91001e783f39f41ffffbbcbd484286.ico" type="image/x-icon">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/4.6.1/css/bootstrap.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap-fileinput/5.2.7/css/fileinput.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/toastr.js/2.1.4/toastr.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --primary-color: #6366f1;
            --primary-hover: #4f46e5;
            --secondary-color: #f8fafc;
            --text-primary: #1e293b;
            --text-secondary: #64748b;
            --border-color: #e2e8f0;
            --card-bg: rgba(255, 255, 255, 0.95);
            --shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
            --shadow-hover: 0 20px 45px -5px rgba(0, 0, 0, 0.15), 0 15px 15px -10px rgba(0, 0, 0, 0.1);
            --gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            position: relative;
            overflow-x: hidden;
            color: var(--text-primary);
        }

        .background-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(45deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1));
            z-index: -2;
        }

        .background {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-size: cover;
            background-position: center;
            z-index: -3;
            transition: opacity 1.5s ease-in-out;
            opacity: 0.3;
            filter: blur(1px);
        }

        .container {
            width: 100%;
            max-width: 480px;
            padding: 20px;
        }

        .card {
            background: var(--card-bg);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 20px;
            box-shadow: var(--shadow);
            padding: 30px;
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
        }

        .card:hover {
            box-shadow: var(--shadow-hover);
            transform: translateY(-5px);
        }

        .card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: var(--gradient);
        }

        .header {
            text-align: center;
            margin-bottom: 30px;
            position: relative;
        }

        .logo {
            width: 60px;
            height: 60px;
            background: var(--gradient);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 15px;
            color: white;
            font-size: 24px;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
        }

        .title {
            font-size: 28px;
            font-weight: 700;
            background: var(--gradient);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            margin-bottom: 8px;
        }

        .subtitle {
            color: var(--text-secondary);
            font-size: 14px;
            font-weight: 400;
        }

        .toolbar {
            position: absolute;
            top: 20px;
            right: 20px;
            display: flex;
            gap: 10px;
        }

        .toolbar-btn {
            background: rgba(255, 255, 255, 0.9);
            border: 1px solid var(--border-color);
            border-radius: 12px;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--text-secondary);
            cursor: pointer;
            transition: all 0.3s ease;
            backdrop-filter: blur(10px);
        }

        .toolbar-btn:hover {
            background: white;
            color: var(--primary-color);
            transform: scale(1.1);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .file-input-container {
            margin-bottom: 20px;
        }

        .file-input-wrapper {
            border: 2px dashed var(--border-color);
            border-radius: 16px;
            padding: 30px 20px;
            text-align: center;
            transition: all 0.3s ease;
            background: rgba(248, 250, 252, 0.5);
            cursor: pointer;
        }

        .file-input-wrapper:hover {
            border-color: var(--primary-color);
            background: rgba(99, 102, 241, 0.05);
        }

        .file-input-wrapper.dragover {
            border-color: var(--primary-color);
            background: rgba(99, 102, 241, 0.1);
            transform: scale(1.02);
        }

        .upload-icon {
            font-size: 48px;
            color: var(--primary-color);
            margin-bottom: 15px;
        }

        .upload-text {
            font-size: 16px;
            color: var(--text-primary);
            margin-bottom: 8px;
            font-weight: 500;
        }

        .upload-hint {
            font-size: 12px;
            color: var(--text-secondary);
        }

        .result-section {
            margin-top: 25px;
            animation: fadeInUp 0.5s ease;
        }

        .format-buttons {
            display: flex;
            gap: 10px;
            margin-bottom: 15px;
        }

        .format-btn {
            flex: 1;
            background: white;
            border: 1px solid var(--border-color);
            border-radius: 10px;
            padding: 10px 15px;
            font-size: 12px;
            color: var(--text-secondary);
            cursor: pointer;
            transition: all 0.3s ease;
            font-weight: 500;
        }

        .format-btn:hover {
            border-color: var(--primary-color);
            color: var(--primary-color);
            transform: translateY(-2px);
        }

        .format-btn.active {
            background: var(--primary-color);
            border-color: var(--primary-color);
            color: white;
        }

        .result-textarea {
            width: 100%;
            border: 1px solid var(--border-color);
            border-radius: 12px;
            padding: 15px;
            font-size: 14px;
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            resize: none;
            background: white;
            transition: all 0.3s ease;
            max-height: 200px;
        }

        .result-textarea:focus {
            outline: none;
            border-color: var(--primary-color);
            box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }

        .cache-section {
            margin-top: 20px;
            max-height: 300px;
            overflow-y: auto;
            border-radius: 12px;
            background: white;
            border: 1px solid var(--border-color);
            display: none;
        }

        .cache-header {
            padding: 15px;
            background: var(--secondary-color);
            border-bottom: 1px solid var(--border-color);
            font-weight: 600;
            color: var(--text-primary);
            border-radius: 12px 12px 0 0;
        }

        .cache-list {
            padding: 10px;
        }

        .cache-item {
            padding: 12px 15px;
            border-radius: 8px;
            margin-bottom: 8px;
            background: white;
            border: 1px solid var(--border-color);
            cursor: pointer;
            transition: all 0.3s ease;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .cache-item:hover {
            border-color: var(--primary-color);
            background: rgba(99, 102, 241, 0.05);
            transform: translateX(5px);
        }

        .cache-info {
            flex: 1;
        }

        .cache-name {
            font-weight: 500;
            color: var(--text-primary);
            margin-bottom: 4px;
        }

        .cache-time {
            font-size: 11px;
            color: var(--text-secondary);
        }

        .cache-url {
            font-size: 10px;
            color: var(--text-secondary);
            word-break: break-all;
        }

        .footer {
            text-align: center;
            margin-top: 25px;
            padding-top: 20px;
            border-top: 1px solid var(--border-color);
        }

        .project-link {
            font-size: 13px;
            color: var(--text-secondary);
        }

        .project-link a {
            color: var(--primary-color);
            text-decoration: none;
            font-weight: 500;
        }

        .project-link a:hover {
            text-decoration: underline;
        }

        .stats {
            display: flex;
            justify-content: space-around;
            margin: 20px 0;
            padding: 15px;
            background: rgba(248, 250, 252, 0.8);
            border-radius: 12px;
            border: 1px solid var(--border-color);
        }

        .stat-item {
            text-align: center;
        }

        .stat-value {
            font-size: 20px;
            font-weight: 700;
            color: var(--primary-color);
            display: block;
        }

        .stat-label {
            font-size: 11px;
            color: var(--text-secondary);
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
        }

        .pulse {
            animation: pulse 2s infinite;
        }

        /* 响应式设计 */
        @media (max-width: 768px) {
            .container {
                padding: 15px;
                max-width: 100%;
            }
            
            .card {
                padding: 20px;
                border-radius: 16px;
            }
            
            .title {
                font-size: 24px;
            }
            
            .toolbar {
                top: 15px;
                right: 15px;
            }
            
            .format-buttons {
                flex-direction: column;
            }
        }

        /* 文件输入自定义样式 */
        .file-caption-icon {
            display: none !important;
        }

        .file-input .btn-file {
            display: none;
        }

        .kv-upload-progress {
            display: none !important;
        }

        .file-preview {
            border: none !important;
            padding: 0 !important;
        }
    </style>
</head>
<body>
    <div class="background-overlay"></div>
    <div class="background" id="background"></div>
    
    <div class="container">
        <div class="card">
            <div class="toolbar">
                <button class="toolbar-btn" id="viewCacheBtn" title="查看历史记录">
                    <i class="fas fa-history"></i>
                </button>
                <button class="toolbar-btn" id="compressionToggleBtn" title="开启压缩">
                    <i class="fas fa-compress-arrows-alt"></i>
                </button>
            </div>

            <div class="header">
                <div class="logo">
                    <i class="fas fa-cloud-upload-alt"></i>
                </div>
                <h1 class="title">Telegraph 图床</h1>
                <p class="subtitle">安全、快速、免费的图片托管服务</p>
            </div>

            <div class="stats">
                <div class="stat-item">
                    <span class="stat-value" id="uploadCount">0</span>
                    <span class="stat-label">今日上传</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value" id="totalCount">0</span>
                    <span class="stat-label">总文件数</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value" id="maxSize">20</span>
                    <span class="stat-label">最大MB</span>
                </div>
            </div>

            <form id="uploadForm" action="/upload" method="post" enctype="multipart/form-data">
                <div class="file-input-container">
                    <div class="file-input-wrapper" id="dropZone">
                        <div class="upload-icon">
                            <i class="fas fa-cloud-upload-alt pulse"></i>
                        </div>
                        <div class="upload-text">点击或拖拽文件到此处</div>
                        <div class="upload-hint">支持 JPG、PNG、GIF 等格式，最大 20MB</div>
                        <input id="fileInput" name="file" type="file" class="file-input" multiple 
                               accept="image/*,video/*,.gif" style="display: none;">
                    </div>
                </div>

                <div class="result-section" id="resultSection" style="display: none;">
                    <div class="format-buttons">
                        <button type="button" class="format-btn active" data-format="url">URL 链接</button>
                        <button type="button" class="format-btn" data-format="bbcode">BBCode</button>
                        <button type="button" class="format-btn" data-format="markdown">Markdown</button>
                    </div>
                    <textarea class="result-textarea" id="fileLink" readonly 
                              placeholder="上传文件后，链接将显示在这里..."></textarea>
                </div>
            </form>

            <div class="cache-section" id="cacheSection">
                <div class="cache-header">
                    <i class="fas fa-clock mr-2"></i>上传历史
                    <button class="float-right btn btn-sm btn-outline-secondary" id="clearCacheBtn" style="border: none; padding: 2px 8px;">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                <div class="cache-list" id="cacheList"></div>
            </div>

            <div class="footer">
                <p class="project-link">
                    项目开源于 <a href="https://github.com/0-RTT/telegraph" target="_blank">GitHub</a> 
                    - 基于 Cloudflare Workers
                </p>
            </div>
        </div>
    </div>

    <script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.6.0/jquery.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/bootstrap-fileinput/5.2.7/js/fileinput.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/bootstrap-fileinput/5.2.7/js/locales/zh.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/toastr.js/2.1.4/toastr.min.js"></script>
    
    <script>
        // 配置 toastr
        toastr.options = {
            closeButton: true,
            progressBar: true,
            positionClass: "toast-top-right",
            timeOut: 3000
        };

        $(document).ready(function() {
            let originalImageURLs = [];
            let isCacheVisible = false;
            let enableCompression = true;
            let currentFormat = 'url';

            // 初始化
            initFileInput();
            setBackgroundImages();
            updateStats();
            bindEvents();

            function bindEvents() {
                // 文件选择区域点击事件
                $('#dropZone').on('click', function() {
                    $('#fileInput').click();
                });

                // 拖拽事件
                $('#dropZone').on('dragover', function(e) {
                    e.preventDefault();
                    $(this).addClass('dragover');
                });

                $('#dropZone').on('dragleave', function(e) {
                    e.preventDefault();
                    $(this).removeClass('dragover');
                });

                $('#dropZone').on('drop', function(e) {
                    e.preventDefault();
                    $(this).removeClass('dragover');
                    const files = e.originalEvent.dataTransfer.files;
                    if (files.length > 0) {
                        $('#fileInput')[0].files = files;
                        handleFileSelection();
                    }
                });

                // 格式按钮事件
                $('.format-btn').on('click', function() {
                    $('.format-btn').removeClass('active');
                    $(this).addClass('active');
                    currentFormat = $(this).data('format');
                    updateLinkFormat();
                });

                // 压缩切换按钮
                $('#compressionToggleBtn').on('click', function() {
                    enableCompression = !enableCompression;
                    const icon = $(this).find('i');
                    const title = enableCompression ? '关闭压缩' : '开启压缩';
                    
                    icon.toggleClass('fa-compress-arrows-alt fa-expand-arrows-alt');
                    $(this).attr('title', title);
                    
                    toastr.info(enableCompression ? '已开启图片压缩' : '已关闭图片压缩');
                });

                // 历史记录按钮
                $('#viewCacheBtn').on('click', function() {
                    toggleCacheView();
                });

                // 清空缓存按钮
                $('#clearCacheBtn').on('click', function(e) {
                    e.stopPropagation();
                    if (confirm('确定要清空所有历史记录吗？')) {
                        localStorage.removeItem('uploadCache');
                        $('#cacheList').empty();
                        toastr.success('历史记录已清空');
                    }
                });

                // 粘贴事件
                $(document).on('paste', handlePaste);
            }

            function initFileInput() {
                // 隐藏默认的文件输入，使用自定义样式
                $("#fileInput").fileinput({
                    theme: 'fa',
                    language: 'zh',
                    showUpload: false,
                    showRemove: false,
                    showPreview: false,
                    showCaption: false,
                    browseOnZoneClick: false,
                    dropZoneEnabled: false
                }).on('filebatchselected', handleFileSelection);
            }

            async function handleFileSelection() {
                const files = $('#fileInput')[0].files;
                if (files.length === 0) return;

                $('#dropZone').addClass('uploading');
                $('#dropZone .upload-icon i').removeClass('fa-cloud-upload-alt').addClass('fa-spinner fa-spin');
                $('#dropZone .upload-text').text('处理中...');

                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    await processFile(file);
                }

                $('#dropZone').removeClass('uploading');
                $('#dropZone .upload-icon i').removeClass('fa-spinner fa-spin').addClass('fa-cloud-upload-alt');
                $('#dropZone .upload-text').text('点击或拖拽文件到此处');
            }

            async function processFile(file) {
                try {
                    const fileHash = await calculateFileHash(file);
                    const cachedData = getCachedData(fileHash);
                    
                    if (cachedData) {
                        handleCachedFile(cachedData);
                        return;
                    }

                    await uploadFile(file, fileHash);
                } catch (error) {
                    console.error('文件处理错误:', error);
                    toastr.error('文件处理失败: ' + error.message);
                }
            }

            async function uploadFile(file, fileHash) {
                toastr.info('上传中...', '', { timeOut: 0 });

                try {
                    let finalFile = file;
                    
                    // 图片压缩（GIF 不压缩）
                    if (file.type.startsWith('image/') && file.type !== 'image/gif' && enableCompression) {
                        toastr.info('正在压缩图片...', '', { timeOut: 0 });
                        finalFile = await compressImage(file);
                    }

                    const formData = new FormData();
                    formData.append('file', finalFile);

                    const response = await fetch('/upload', {
                        method: 'POST',
                        body: formData
                    });

                    const result = await response.json();

                    if (result.error) {
                        throw new Error(result.error);
                    }

                    originalImageURLs.push(result.data);
                    updateResultDisplay();
                    saveToCache(result.data, file.name, fileHash);
                    
                    toastr.success('上传成功！');
                    updateStats();

                } catch (error) {
                    toastr.error('上传失败: ' + error.message);
                } finally {
                    toastr.clear();
                }
            }

            function updateResultDisplay() {
                $('#resultSection').show();
                updateLinkFormat();
                
                // 自动复制到剪贴板
                const text = $('#fileLink').val();
                copyToClipboard(text);
                toastr.success('链接已复制到剪贴板');
            }

            function updateLinkFormat() {
                if (originalImageURLs.length === 0) return;

                let formattedText = '';
                const links = originalImageURLs.map(url => url.trim()).filter(url => url);

                switch (currentFormat) {
                    case 'url':
                        formattedText = links.join('\n\n');
                        break;
                    case 'bbcode':
                        formattedText = links.map(url => `[img]${url}[/img]`).join('\n\n');
                        break;
                    case 'markdown':
                        formattedText = links.map(url => `![image](${url})`).join('\n\n');
                        break;
                }

                $('#fileLink').val(formattedText);
                adjustTextareaHeight();
            }

            function toggleCacheView() {
                const cacheSection = $('#cacheSection');
                const cacheList = $('#cacheList');
                
                if (isCacheVisible) {
                    cacheSection.slideUp();
                    isCacheVisible = false;
                } else {
                    loadCacheData();
                    cacheSection.slideDown();
                    isCacheVisible = true;
                }
            }

            function loadCacheData() {
                const cacheData = JSON.parse(localStorage.getItem('uploadCache')) || [];
                const cacheList = $('#cacheList');
                
                cacheList.empty();

                if (cacheData.length === 0) {
                    cacheList.html('<div class="text-center py-4 text-muted">暂无历史记录</div>');
                    return;
                }

                cacheData.reverse().forEach(item => {
                    const cacheItem = $(`
                        <div class="cache-item" data-url="${item.url}">
                            <div class="cache-info">
                                <div class="cache-name">${item.fileName}</div>
                                <div class="cache-time">${item.timestamp}</div>
                                <div class="cache-url">${item.url}</div>
                            </div>
                            <i class="fas fa-copy copy-cache" style="color: var(--text-secondary); cursor: pointer;"></i>
                        </div>
                    `);
                    
                    cacheList.append(cacheItem);
                });

                // 缓存项点击事件
                $('.cache-item').on('click', function(e) {
                    if (!$(e.target).hasClass('copy-cache')) {
                        const url = $(this).data('url');
                        originalImageURLs = [url];
                        $('#resultSection').show();
                        updateLinkFormat();
                    }
                });

                // 复制按钮事件
                $('.copy-cache').on('click', function(e) {
                    e.stopPropagation();
                    const url = $(this).closest('.cache-item').data('url');
                    copyToClipboard(url);
                    toastr.success('链接已复制');
                });
            }

            // 其他辅助函数（calculateFileHash, compressImage, copyToClipboard 等）
            // 这些函数与原始代码类似，这里省略以保持简洁...
            async function calculateFileHash(file) {
                const arrayBuffer = await file.arrayBuffer();
                const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
                const hashArray = Array.from(new Uint8Array(hashBuffer));
                return hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
            }

            async function compressImage(file, quality = 0.75) {
                return new Promise((resolve) => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    const img = new Image();
                    
                    img.onload = function() {
                        canvas.width = img.width;
                        canvas.height = img.height;
                        ctx.drawImage(img, 0, 0);
                        
                        canvas.toBlob((blob) => {
                            const compressedFile = new File([blob], file.name, { 
                                type: 'image/jpeg' 
                            });
                            resolve(compressedFile);
                        }, 'image/jpeg', quality);
                    };
                    
                    const reader = new FileReader();
                    reader.onload = (e) => img.src = e.target.result;
                    reader.readAsDataURL(file);
                });
            }

            function copyToClipboard(text) {
                const textarea = document.createElement('textarea');
                textarea.value = text;
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
            }

            function adjustTextareaHeight() {
                const textarea = $('#fileLink')[0];
                textarea.style.height = 'auto';
                textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
            }

            function saveToCache(url, fileName, fileHash) {
                const cacheData = JSON.parse(localStorage.getItem('uploadCache')) || [];
                const timestamp = new Date().toLocaleString('zh-CN', { hour12: false });
                
                cacheData.push({
                    url,
                    fileName,
                    hash: fileHash,
                    timestamp
                });
                
                localStorage.setItem('uploadCache', JSON.stringify(cacheData));
            }

            function getCachedData(fileHash) {
                const cacheData = JSON.parse(localStorage.getItem('uploadCache')) || [];
                return cacheData.find(item => item.hash === fileHash);
            }

            function handleCachedFile(cachedData) {
                if (!originalImageURLs.includes(cachedData.url)) {
                    originalImageURLs.push(cachedData.url);
                    updateResultDisplay();
                    toastr.info('已从缓存加载');
                }
            }

            async function handlePaste(event) {
                const items = event.originalEvent.clipboardData?.items;
                if (!items) return;

                for (let item of items) {
                    if (item.kind === 'file') {
                        const file = item.getAsFile();
                        const dataTransfer = new DataTransfer();
                        const existingFiles = $('#fileInput')[0].files;
                        
                        for (let i = 0; i < existingFiles.length; i++) {
                            dataTransfer.items.add(existingFiles[i]);
                        }
                        dataTransfer.items.add(file);
                        
                        $('#fileInput')[0].files = dataTransfer.files;
                        await handleFileSelection();
                        break;
                    }
                }
            }

            function updateStats() {
                // 这里可以添加实际的统计逻辑
                // 目前使用模拟数据
                const cacheData = JSON.parse(localStorage.getItem('uploadCache')) || [];
                $('#uploadCount').text(cacheData.length);
                $('#totalCount').text(cacheData.length);
            }

            // Bing 背景图片
            async function setBackgroundImages() {
                try {
                    const response = await fetch('/bing-images');
                    const data = await response.json();
                    
                    if (data.data && data.data.length > 0) {
                        const images = data.data.map(item => item.url);
                        let currentIndex = 0;
                        
                        function changeBackground() {
                            const background = $('#background');
                            const nextImage = new Image();
                            
                            nextImage.onload = function() {
                                background.css('background-image', 'url(' + images[currentIndex] + ')');
                                currentIndex = (currentIndex + 1) % images.length;
                            };
                            
                            nextImage.src = images[currentIndex];
                        }
                        
                        changeBackground();
                        setInterval(changeBackground, 8000);
                    }
                } catch (error) {
                    console.error('加载背景图片失败:', error);
                }
            }
        });
    </script>
</body>
</html>`, {
    headers: { 'Content-Type': 'text/html;charset=UTF-8' }
  });

  await cache.put(cacheKey, response.clone());
  return response;
}

async function handleAdminRequest(DATABASE, request, USERNAME, PASSWORD) {
    if (!authenticate(request, USERNAME, PASSWORD)) {
        return new Response('Unauthorized', {
            status: 401,
            headers: { 'WWW-Authenticate': 'Basic realm="Admin"' }
        });
    }
    
    return await generateAdminPage(DATABASE);
}

function isValidCredentials(authHeader, USERNAME, PASSWORD) {
    const base64Credentials = authHeader.split(' ')[1];
    const credentials = atob(base64Credentials).split(':');
    const username = credentials[0];
    const password = credentials[1];
    return username === USERNAME && password === PASSWORD;
}

async function generateAdminPage(DATABASE) {
    const mediaData = await fetchMediaData(DATABASE);
    const mediaHtml = mediaData.map(({ url }) => {
        const fileExtension = url.split('.').pop().toLowerCase();
        const timestamp = url.split('/').pop().split('.')[0];
        const mediaType = fileExtension;
        let displayUrl = url;
        
        const supportedImageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tiff', 'svg'];
        const supportedVideoExtensions = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'webm'];
        const isSupported = [...supportedImageExtensions, ...supportedVideoExtensions].includes(fileExtension);
        const backgroundStyle = isSupported ? '' : `style="font-size: 50px; display: flex; justify-content: center; align-items: center;"`;
        const icon = isSupported ? '' : '📁';
        
        return `
            <div class="media-container" data-key="${url}" onclick="toggleImageSelection(this)" ${backgroundStyle}>
                <div class="media-type">${mediaType}</div>
                ${supportedVideoExtensions.includes(fileExtension) ? `
                    <video class="gallery-video" preload="none" style="width: 100%; height: 100%; object-fit: contain;" controls>
                        <source data-src="${displayUrl}" type="video/${fileExtension}">
                        您的浏览器不支持视频标签。
                    </video>
                ` : `
                    ${isSupported ? `<img class="gallery-image lazy" data-src="${displayUrl}" alt="Image">` : icon}
                `}
                <div class="upload-time">上传时间: ${new Date(parseInt(timestamp)).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}</div>
            </div>
        `;
    }).join('');
    
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>图库</title>
    <link rel="icon" href="https://p1.meituan.net/csc/c195ee91001e783f39f41ffffbbcbd484286.ico" type="image/x-icon">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px; }
        .header { position: sticky; top: 0; background-color: #ffffff; z-index: 1000; display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding: 15px 20px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); border-radius: 8px; flex-wrap: wrap; }
        .header-left { flex: 1; }
        .header-right { display: flex; gap: 10px; justify-content: flex-end; flex: 1; justify-content: flex-end; flex-wrap: wrap; }
        .gallery { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; }
        .media-container { position: relative; overflow: hidden; border-radius: 12px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); aspect-ratio: 1 / 1; transition: transform 0.3s, box-shadow 0.3s; }
        .media-type { position: absolute; top: 10px; left: 10px; background-color: rgba(0, 0, 0, 0.7); color: white; padding: 5px; border-radius: 5px; font-size: 14px; z-index: 10; cursor: pointer; }
        .upload-time { position: absolute; bottom: 10px; left: 10px; background-color: rgba(255, 255, 255, 0.7); padding: 5px; border-radius: 5px; color: #000; font-size: 14px; z-index: 10; display: none; }
        .media-container:hover { transform: scale(1.05); box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2); }
        .gallery-image { width: 100%; height: 100%; object-fit: contain; transition: opacity 0.3s; opacity: 0; }
        .gallery-image.loaded { opacity: 1; }
        .media-container.selected { border: 2px solid #007bff; background-color: rgba(0, 123, 255, 0.1); }
        .footer { margin-top: 20px; text-align: center; font-size: 18px; color: #555; }
        .delete-button, .copy-button { background-color: #ff4d4d; color: white; border: none; border-radius: 5px; padding: 10px 15px; cursor: pointer; transition: background-color 0.3s; width: auto; }
        .delete-button:hover, .copy-button:hover { background-color: #ff1a1a; }
        .hidden { display: none; }
        .dropdown { position: relative; display: inline-block; }
        .dropdown-content { display: none; position: absolute; background-color: #f9f9f9; min-width: 160px; box-shadow: 0px 8px 16px 0px rgba(0,0,0,0.2); z-index: 1; border-radius: 8px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); }
        .dropdown-content button { color: black; padding: 12px 16px; text-decoration: none; display: block; background: none; border: none; width: 100%; text-align: left; }
        .dropdown-content button:hover { background-color: #f1f1f1; }
        .dropdown:hover .dropdown-content { display: block; }
        @media (max-width: 768px) {
            .header-left, .header-right { flex: 1 1 100%; justify-content: flex-start; }
            .header-right { margin-top: 10px; }
            .gallery { grid-template-columns: repeat(2, 1fr); }
        }
    </style>
    <script>
        let selectedCount = 0;
        const selectedKeys = new Set();
        let isAllSelected = false;
        
        function toggleImageSelection(container) {
            const key = container.getAttribute('data-key');
            container.classList.toggle('selected');
            const uploadTime = container.querySelector('.upload-time');
            if (container.classList.contains('selected')) {
                selectedKeys.add(key);
                selectedCount++;
                uploadTime.style.display = 'block';
            } else {
                selectedKeys.delete(key);
                selectedCount--;
                uploadTime.style.display = 'none';
            }
            updateDeleteButton();
        }
        
        function updateDeleteButton() {
            const deleteButton = document.getElementById('delete-button');
            const countDisplay = document.getElementById('selected-count');
            countDisplay.textContent = selectedCount;
            const headerRight = document.querySelector('.header-right');
            if (selectedCount > 0) {
                headerRight.classList.remove('hidden');
            } else {
                headerRight.classList.add('hidden');
            }
        }
        
        async function deleteSelectedImages() {
            if (selectedKeys.size === 0) return;
            const confirmation = confirm('你确定要删除选中的媒体文件吗？此操作无法撤回。');
            if (!confirmation) return;
            
            const response = await fetch('/delete-images', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(Array.from(selectedKeys))
            });
            
            if (response.ok) {
                alert('选中的媒体已删除');
                location.reload();
            } else {
                alert('删除失败');
            }
        }
        
        function copyFormattedLinks(format) {
            const urls = Array.from(selectedKeys).map(url => url.trim()).filter(url => url !== '');
            let formattedLinks = '';
            switch (format) {
                case 'url':
                    formattedLinks = urls.join('\\n\\n');
                    break;
                case 'bbcode':
                    formattedLinks = urls.map(url => '[img]' + url + '[/img]').join('\\n\\n');
                    break;
                case 'markdown':
                    formattedLinks = urls.map(url => '![image](' + url + ')').join('\\n\\n');
                    break;
            }
            navigator.clipboard.writeText(formattedLinks).then(() => {
                alert('复制成功');
            }).catch((err) => {
                alert('复制失败');
            });
        }
        
        function selectAllImages() {
            const mediaContainers = document.querySelectorAll('.media-container');
            if (isAllSelected) {
                mediaContainers.forEach(container => {
                    container.classList.remove('selected');
                    const key = container.getAttribute('data-key');
                    selectedKeys.delete(key);
                    container.querySelector('.upload-time').style.display = 'none';
                });
                selectedCount = 0;
            } else {
                mediaContainers.forEach(container => {
                    if (!container.classList.contains('selected')) {
                        container.classList.add('selected');
                        const key = container.getAttribute('data-key');
                        selectedKeys.add(key);
                        selectedCount++;
                        container.querySelector('.upload-time').style.display = 'block';
                    }
                });
            }
            isAllSelected = !isAllSelected;
            updateDeleteButton();
        }
        
        document.addEventListener('DOMContentLoaded', () => {
            const mediaContainers = document.querySelectorAll('.media-container[data-key]');
            const options = { root: null, rootMargin: '0px', threshold: 0.1 };
            
            const mediaObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const container = entry.target;
                        const video = container.querySelector('video');
                        if (video) {
                            const source = video.querySelector('source');
                            video.src = source.getAttribute('data-src');
                            video.load();
                        } else {
                            const img = container.querySelector('img');
                            if (img && !img.src) {
                                img.src = img.getAttribute('data-src');
                                img.onload = () => img.classList.add('loaded');
                            }
                        }
                        observer.unobserve(container);
                    }
                });
            }, options);
            
            mediaContainers.forEach(container => {
                mediaObserver.observe(container);
            });
        });
    </script>
</head>
<body>
    <div class="header">
        <div class="header-left">
            <span>媒体文件 ${mediaData.length} 个</span>
            <span>已选中: <span id="selected-count">0</span>个</span>
        </div>
        <div class="header-right hidden">
            <div class="dropdown">
                <button class="copy-button">复制</button>
                <div class="dropdown-content">
                    <button onclick="copyFormattedLinks('url')">URL</button>
                    <button onclick="copyFormattedLinks('bbcode')">BBCode</button>
                    <button onclick="copyFormattedLinks('markdown')">Markdown</button>
                </div>
            </div>
            <button id="select-all-button" class="delete-button" onclick="selectAllImages()">全选</button>
            <button id="delete-button" class="delete-button" onclick="deleteSelectedImages()">删除</button>
        </div>
    </div>
    <div class="gallery">
        ${mediaHtml}
    </div>
    <div class="footer">
        到底啦
    </div>
</body>
</html>`;
    
    return new Response(html, {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
}

async function fetchMediaData(DATABASE) {
    const result = await DATABASE.prepare('SELECT url, fileId FROM media').all();
    const mediaData = result.results.map(row => {
        const timestamp = parseInt(row.url.split('/').pop().split('.')[0]);
        return { fileId: row.fileId, url: row.url, timestamp: timestamp };
    });
    
    mediaData.sort((a, b) => b.timestamp - a.timestamp);
    return mediaData.map(({ fileId, url }) => ({ fileId, url }));
}

async function handleUploadRequest(request, DATABASE, enableAuth, USERNAME, PASSWORD, domain, TG_BOT_TOKEN, TG_CHAT_ID, maxSize) {
    try {
        const formData = await request.formData();
        const file = formData.get('file');
        
        if (!file) throw new Error('缺少文件');
        
        if (file.size > maxSize) {
            return new Response(JSON.stringify({ error: `文件大小超过${maxSize / (1024 * 1024)}MB限制` }), {
                status: 413,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        if (enableAuth && !authenticate(request, USERNAME, PASSWORD)) {
            return new Response('Unauthorized', {
                status: 401,
                headers: { 'WWW-Authenticate': 'Basic realm="Admin"' }
            });
        }
        
        const uploadFormData = new FormData();
        uploadFormData.append("chat_id", TG_CHAT_ID);
        
        let fileId;
        if (file.type.startsWith('image/gif')) {
            const newFileName = file.name.replace(/\.gif$/, '.jpeg');
            const newFile = new File([file], newFileName, { type: 'image/jpeg' });
            uploadFormData.append("document", newFile);
        } else {
            uploadFormData.append("document", file);
        }
        
        const telegramResponse = await fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/sendDocument`, {
            method: 'POST',
            body: uploadFormData
        });
        
        if (!telegramResponse.ok) {
            const errorData = await telegramResponse.json();
            throw new Error(errorData.description || '上传到 Telegram 失败');
        }
        
        const responseData = await telegramResponse.json();
        if (responseData.result.video) fileId = responseData.result.video.file_id;
        else if (responseData.result.document) fileId = responseData.result.document.file_id;
        else if (responseData.result.sticker) fileId = responseData.result.sticker.file_id;
        else throw new Error('返回的数据中没有文件 ID');
        
        const fileExtension = file.name.split('.').pop();
        const timestamp = Date.now();
        const imageURL = `https://${domain}/${timestamp}.${fileExtension}`;
        
        await DATABASE.prepare('INSERT INTO media (url, fileId) VALUES (?, ?) ON CONFLICT(url) DO NOTHING')
            .bind(imageURL, fileId)
            .run();
        
        return new Response(JSON.stringify({ data: imageURL }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
        
    } catch (error) {
        console.error('内部服务器错误:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

async function handleImageRequest(request, DATABASE, TG_BOT_TOKEN) {
    const requestedUrl = request.url;
    const cache = caches.default;
    const cacheKey = new Request(requestedUrl);
    
    const cachedResponse = await cache.match(cacheKey);
    if (cachedResponse) return cachedResponse;
    
    const result = await DATABASE.prepare('SELECT fileId FROM media WHERE url = ?').bind(requestedUrl).first();
    if (!result) {
        const notFoundResponse = new Response('资源不存在', { status: 404 });
        await cache.put(cacheKey, notFoundResponse.clone());
        return notFoundResponse;
    }
    
    const fileId = result.fileId;
    let filePath;
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
        const getFilePath = await fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/getFile?file_id=${fileId}`);
        if (!getFilePath.ok) {
            return new Response('getFile请求失败', { status: 500 });
        }
        
        const fileData = await getFilePath.json();
        if (fileData.ok && fileData.result.file_path) {
            filePath = fileData.result.file_path;
            break;
        }
        attempts++;
    }
    
    if (!filePath) {
        const notFoundResponse = new Response('未找到FilePath', { status: 404 });
        await cache.put(cacheKey, notFoundResponse.clone());
        return notFoundResponse;
    }
    
    const getFileResponse = `https://api.telegram.org/file/bot${TG_BOT_TOKEN}/${filePath}`;
    const response = await fetch(getFileResponse);
    
    if (!response.ok) {
        return new Response('获取文件内容失败', { status: 500 });
    }
    
    const fileExtension = requestedUrl.split('.').pop().toLowerCase();
    let contentType = 'text/plain';
    if (fileExtension === 'jpg' || fileExtension === 'jpeg') contentType = 'image/jpeg';
    if (fileExtension === 'png') contentType = 'image/png';
    if (fileExtension === 'gif') contentType = 'image/gif';
    if (fileExtension === 'webp') contentType = 'image/webp';
    if (fileExtension === 'mp4') contentType = 'video/mp4';
    
    const headers = new Headers(response.headers);
    headers.set('Content-Type', contentType);
    headers.set('Content-Disposition', 'inline');
    
    const responseToCache = new Response(response.body, {
        status: response.status,
        headers
    });
    
    await cache.put(cacheKey, responseToCache.clone());
    return responseToCache;
}

async function handleBingImagesRequest(request) {
    const cache = caches.default;
    const cacheKey = new Request('https://cn.bing.com/HPImageArchive.aspx?format=js&idx=0&n=5');
    
    const cachedResponse = await cache.match(cacheKey);
    if (cachedResponse) return cachedResponse;
    
    const res = await fetch(cacheKey);
    if (!res.ok) {
        return new Response('请求 Bing API 失败', { status: res.status });
    }
    
    const bingData = await res.json();
    const images = bingData.images.map(image => ({
        url: `https://cn.bing.com${image.url}`
    }));
    
    const returnData = {
        status: true,
        message: "操作成功",
        data: images
    };
    
    const response = new Response(JSON.stringify(returnData), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });
    
    await cache.put(cacheKey, response.clone());
    return response;
}

async function handleDeleteImagesRequest(request, DATABASE, USERNAME, PASSWORD) {
    if (!authenticate(request, USERNAME, PASSWORD)) {
        return new Response('Unauthorized', {
            status: 401,
            headers: { 'WWW-Authenticate': 'Basic realm="Admin"' }
        });
    }
    
    if (request.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
    }
    
    try {
        const keysToDelete = await request.json();
        if (!Array.isArray(keysToDelete) || keysToDelete.length === 0) {
            return new Response(JSON.stringify({ message: '没有要删除的项' }), { status: 400 });
        }
        
        const placeholders = keysToDelete.map(() => '?').join(',');
        const result = await DATABASE.prepare(`DELETE FROM media WHERE url IN (${placeholders})`)
            .bind(...keysToDelete)
            .run();
        
        if (result.changes === 0) {
            return new Response(JSON.stringify({ message: '未找到要删除的项' }), { status: 404 });
        }
        
        const cache = caches.default;
        for (const url of keysToDelete) {
            const cacheKey = new Request(url);
            const cachedResponse = await cache.match(cacheKey);
            if (cachedResponse) {
                await cache.delete(cacheKey);
            }
        }
        
        return new Response(JSON.stringify({ message: '删除成功' }), { status: 200 });
        
    } catch (error) {
        return new Response(JSON.stringify({ error: '删除失败', details: error.message }), { status: 500 });
    }
}

// 新增的随机图片API处理函数
async function handleRandomRequest(request, DATABASE) {
    try {
        // 获取所有图片媒体数据
        const imageMedia = await fetchImageMediaData(DATABASE);
        
        if (imageMedia.length === 0) {
            return new Response(JSON.stringify({ 
                error: '没有可用的图片' 
            }), { 
                status: 404, 
                headers: { 'Content-Type': 'application/json' } 
            });
        }
        
        // 随机选择一张图片
        const randomIndex = Math.floor(Math.random() * imageMedia.length);
        const randomImage = imageMedia[randomIndex];
        
        // 返回图片信息或重定向到图片URL
        const acceptHeader = request.headers.get('accept') || '';
        
        if (acceptHeader.includes('application/json')) {
            // 如果客户端请求JSON，返回图片信息
            return new Response(JSON.stringify({
                url: randomImage.url,
                fileId: randomImage.fileId,
                type: 'image'
            }), {
                headers: { 'Content-Type': 'application/json' }
            });
        } else {
            // 否则重定向到图片URL
            return new Response(null, {
                status: 302,
                headers: {
                    'Location': randomImage.url,
                    'Cache-Control': 'no-cache'
                }
            });
        }
        
    } catch (error) {
        console.error('随机图片API错误:', error);
        return new Response(JSON.stringify({ 
            error: '获取随机图片失败' 
        }), { 
            status: 500, 
            headers: { 'Content-Type': 'application/json' } 
        });
    }
}

// 获取图片媒体数据（只返回图片文件）
async function fetchImageMediaData(DATABASE) {
    const result = await DATABASE.prepare('SELECT url, fileId FROM media').all();
    const mediaData = result.results.map(row => ({
        fileId: row.fileId,
        url: row.url,
        timestamp: parseInt(row.url.split('/').pop().split('.')[0])
    }));
    
    // 过滤出图片文件（基于文件扩展名）
    const imageExtensions = [
        'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tiff', 'svg'
    ];
    
    const imageMedia = mediaData.filter(media => {
        const fileExtension = media.url.split('.').pop().toLowerCase();
        return imageExtensions.includes(fileExtension);
    });
    
    return imageMedia;
}

// 增强的文件类型检测函数
function isImageFile(url) {
    const imageExtensions = [
        'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tiff', 'svg'
    ];
    
    const fileExtension = url.split('.').pop().toLowerCase();
    
    // 基础扩展名检查
    if (!imageExtensions.includes(fileExtension)) {
        return false;
    }
    
    // 额外的安全检查：确保URL格式正确
    try {
        const urlObj = new URL(url);
        const pathname = urlObj.pathname;
        const filename = pathname.split('/').pop();
        
        // 检查文件名是否包含时间戳格式（基于您当前的命名规则）
        const timestampPart = filename.split('.')[0];
        if (!/^\d+$/.test(timestampPart)) {
            return false;
        }
        
        return true;
    } catch (e) {
        return false;
    }
}


