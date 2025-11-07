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
                return await handleRandomRequest(request, DATABASE);
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
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/4.6.1/css/bootstrap.min.css" integrity="sha512-T584yQ/tdRR5QwOpfvDfVQUidzfgc2339Lc8uBDtcp/wYu80d7jwBgAxbyMh0a9YM9F8N3tdErpFI8iaGx6x5g==" crossorigin="anonymous" referrerpolicy="no-referrer" />
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap-fileinput/5.2.7/css/fileinput.min.css" integrity="sha512-qPjB0hQKYTx1Za9Xip5h0PXcxaR1cRbHuZHo9z+gb5IgM6ZOTtIH4QLITCxcCp/8RMXtw2Z85MIZLv6LfGTLiw==" crossorigin="anonymous" referrerpolicy="no-referrer" />
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/toastr.js/2.1.4/toastr.min.css" integrity="sha512-6S2HWzVFxruDlZxI3sXOZZ4/eJ8AcxkQH1+JjSe/ONCEqR9L4Ysq5JdT5ipqtzU7WHalNwzwBv+iE51gNHJNqQ==" crossorigin="anonymous" referrerpolicy="no-referrer" />
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css" integrity="sha512-1ycn6IcaQQ40/MKBW2W4Rhis/DbILU74C1vSrLJxCq57o941Ym01SwNsOMqvEBFlcgUa6xLiPY/NS5R+E6ztJQ==" crossorigin="anonymous" referrerpolicy="no-referrer" />
    <style>
        :root {
            --primary-color: #4361ee;
            --secondary-color: #3f37c9;
            --accent-color: #4895ef;
            --light-color: #f8f9fa;
            --dark-color: #212529;
            --success-color: #4cc9f0;
            --warning-color: #f72585;
            --glass-bg: rgba(255, 255, 255, 0.25);
            --glass-border: rgba(255, 255, 255, 0.18);
            --shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
            --transition: all 0.3s ease;
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            position: relative;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            overflow-x: hidden;
        }
        
        .background {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-size: cover;
            background-position: center;
            z-index: -2;
            transition: opacity 1.5s ease-in-out;
            opacity: 1;
        }
        
        .overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.3);
            z-index: -1;
        }
        
        .container {
            width: 100%;
            max-width: 900px;
            padding: 20px;
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        
        .card {
            background: var(--glass-bg);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border-radius: 20px;
            border: 1px solid var(--glass-border);
            box-shadow: var(--shadow);
            padding: 30px;
            width: 100%;
            text-align: center;
            margin-bottom: 20px;
            transition: var(--transition);
        }
        
        .card:hover {
            transform: translateY(-5px);
            box-shadow: 0 12px 40px 0 rgba(31, 38, 135, 0.5);
        }
        
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 25px;
            position: relative;
        }
        
        .title {
            font-size: 28px;
            font-weight: 700;
            color: white;
            text-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
            letter-spacing: 1px;
        }
        
        .controls {
            display: flex;
            gap: 15px;
        }
        
        .control-btn {
            background: rgba(255, 255, 255, 0.2);
            border: none;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 18px;
            cursor: pointer;
            transition: var(--transition);
            backdrop-filter: blur(5px);
        }
        
        .control-btn:hover {
            background: rgba(255, 255, 255, 0.3);
            transform: scale(1.1);
        }
        
        .upload-area {
            border: 2px dashed rgba(255, 255, 255, 0.4);
            border-radius: 15px;
            padding: 40px 20px;
            margin-bottom: 25px;
            transition: var(--transition);
            background: rgba(255, 255, 255, 0.1);
        }
        
        .upload-area.active {
            border-color: var(--accent-color);
            background: rgba(67, 97, 238, 0.1);
        }
        
        .upload-icon {
            font-size: 50px;
            color: rgba(255, 255, 255, 0.7);
            margin-bottom: 15px;
        }
        
        .upload-text {
            color: white;
            font-size: 18px;
            margin-bottom: 10px;
        }
        
        .upload-hint {
            color: rgba(255, 255, 255, 0.7);
            font-size: 14px;
        }
        
        .file-input-container {
            margin-bottom: 20px;
        }
        
        .kv-upload-progress {
            display: none !important;
        }
        
        .file-caption {
            color: white !important;
        }
        
        .file-drop-zone {
            border: 2px dashed rgba(255, 255, 255, 0.4) !important;
            border-radius: 10px !important;
            background: rgba(255, 255, 255, 0.05) !important;
        }
        
        .file-drop-zone-title {
            color: rgba(255, 255, 255, 0.8) !important;
            padding: 30px 10px !important;
        }
        
        .btn-file {
            background: rgba(255, 255, 255, 0.2) !important;
            color: white !important;
            border: none !important;
            border-radius: 50px !important;
            padding: 10px 25px !important;
            backdrop-filter: blur(5px);
            transition: var(--transition) !important;
        }
        
        .btn-file:hover {
            background: rgba(255, 255, 255, 0.3) !important;
            transform: translateY(-2px);
        }
        
        .file-preview {
            background: rgba(255, 255, 255, 0.1) !important;
            border: none !important;
            border-radius: 10px !important;
        }
        
        .results-panel {
            background: rgba(255, 255, 255, 0.15);
            border-radius: 15px;
            padding: 20px;
            margin-top: 20px;
            transition: var(--transition);
            max-height: 0;
            overflow: hidden;
            opacity: 0;
        }
        
        .results-panel.show {
            max-height: 500px;
            opacity: 1;
        }
        
        .format-buttons {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
            justify-content: center;
            flex-wrap: wrap;
        }
        
        .format-btn {
            background: rgba(255, 255, 255, 0.2);
            border: none;
            border-radius: 50px;
            color: white;
            padding: 8px 20px;
            font-size: 14px;
            transition: var(--transition);
            backdrop-filter: blur(5px);
        }
        
        .format-btn:hover {
            background: rgba(255, 255, 255, 0.3);
            transform: translateY(-2px);
        }
        
        .format-btn.active {
            background: var(--primary-color);
        }
        
        .result-textarea {
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 10px;
            color: white;
            padding: 15px;
            width: 100%;
            min-height: 120px;
            resize: vertical;
            transition: var(--transition);
        }
        
        .result-textarea:focus {
            outline: none;
            border-color: var(--accent-color);
            box-shadow: 0 0 0 2px rgba(67, 97, 238, 0.3);
        }
        
        .result-textarea::placeholder {
            color: rgba(255, 255, 255, 0.5);
        }
        
        .history-panel {
            background: rgba(255, 255, 255, 0.15);
            border-radius: 15px;
            padding: 20px;
            margin-top: 15px;
            transition: var(--transition);
            max-height: 0;
            overflow: hidden;
            opacity: 0;
        }
        
        .history-panel.show {
            max-height: 300px;
            opacity: 1;
            overflow-y: auto;
        }
        
        .history-title {
            color: white;
            font-size: 16px;
            margin-bottom: 15px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .history-item {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 10px;
            padding: 12px 15px;
            margin-bottom: 10px;
            color: white;
            display: flex;
            justify-content: space-between;
            align-items: center;
            transition: var(--transition);
            cursor: pointer;
        }
        
        .history-item:hover {
            background: rgba(255, 255, 255, 0.2);
            transform: translateX(5px);
        }
        
        .history-info {
            display: flex;
            flex-direction: column;
            flex: 1;
        }
        
        .history-name {
            font-weight: 500;
            margin-bottom: 5px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        
        .history-time {
            font-size: 12px;
            color: rgba(255, 255, 255, 0.7);
        }
        
        .history-actions {
            display: flex;
            gap: 10px;
        }
        
        .history-action {
            background: none;
            border: none;
            color: rgba(255, 255, 255, 0.7);
            cursor: pointer;
            transition: var(--transition);
        }
        
        .history-action:hover {
            color: white;
            transform: scale(1.2);
        }
        
        .empty-history {
            text-align: center;
            color: rgba(255, 255, 255, 0.7);
            padding: 20px;
        }
        
        .footer {
            color: rgba(255, 255, 255, 0.7);
            text-align: center;
            font-size: 14px;
            margin-top: 20px;
        }
        
        .footer a {
            color: rgba(255, 255, 255, 0.9);
            text-decoration: none;
            transition: var(--transition);
        }
        
        .footer a:hover {
            color: white;
            text-decoration: underline;
        }
        
        .badge {
            background: var(--primary-color);
            color: white;
            padding: 4px 10px;
            border-radius: 50px;
            font-size: 12px;
            margin-left: 10px;
        }
        
        .progress-container {
            width: 100%;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 10px;
            margin: 15px 0;
            overflow: hidden;
            display: none;
        }
        
        .progress-bar {
            height: 6px;
            background: linear-gradient(90deg, var(--primary-color), var(--accent-color));
            border-radius: 10px;
            width: 0%;
            transition: width 0.3s ease;
        }
        
        .stats {
            display: flex;
            justify-content: space-around;
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .stat-item {
            text-align: center;
            color: white;
        }
        
        .stat-value {
            font-size: 24px;
            font-weight: 700;
            margin-bottom: 5px;
        }
        
        .stat-label {
            font-size: 12px;
            color: rgba(255, 255, 255, 0.7);
        }
        
        @media (max-width: 768px) {
            .container {
                padding: 10px;
            }
            
            .card {
                padding: 20px;
            }
            
            .title {
                font-size: 22px;
            }
            
            .format-buttons {
                flex-direction: column;
                align-items: center;
            }
            
            .format-btn {
                width: 100%;
                margin-bottom: 5px;
            }
            
            .header {
                flex-direction: column;
                gap: 15px;
            }
            
            .controls {
                width: 100%;
                justify-content: center;
            }
        }
        
        /* 自定义Toastr样式 */
        .toast-success {
            background: rgba(76, 201, 240, 0.9) !important;
            backdrop-filter: blur(10px);
        }
        
        .toast-error {
            background: rgba(247, 37, 133, 0.9) !important;
            backdrop-filter: blur(10px);
        }
        
        .toast-info {
            background: rgba(67, 97, 238, 0.9) !important;
            backdrop-filter: blur(10px);
        }
    </style>
</head>
<body>
    <div class="background" id="background"></div>
    <div class="overlay"></div>
    
    <div class="container">
        <div class="card">
            <div class="header">
                <h1 class="title">Telegraph图床 <span class="badge">Beta</span></h1>
                <div class="controls">
                    <button type="button" class="control-btn" id="viewCacheBtn" title="查看历史记录">
                        <i class="fas fa-history"></i>
                    </button>
                    <button type="button" class="control-btn" id="compressionToggleBtn" title="开启压缩">
                        <i class="fas fa-compress-arrows-alt"></i>
                    </button>
                    <button type="button" class="control-btn" id="infoBtn" title="使用说明">
                        <i class="fas fa-info-circle"></i>
                    </button>
                </div>
            </div>
            
            <div class="upload-area" id="uploadArea">
                <div class="upload-icon">
                    <i class="fas fa-cloud-upload-alt"></i>
                </div>
                <p class="upload-text">拖放文件到此处或点击上传</p>
                <p class="upload-hint">支持图片、GIF和视频文件，最大 ${maxSizeMB}MB</p>
            </div>
            
            <div class="file-input-container">
                <input id="fileInput" name="file" type="file" class="form-control-file" data-browse-on-zone-click="true" multiple>
            </div>
            
            <div class="progress-container" id="progressContainer">
                <div class="progress-bar" id="progressBar"></div>
            </div>
            
            <div class="results-panel" id="resultsPanel">
                <div class="format-buttons">
                    <button type="button" class="format-btn active" id="urlBtn">URL链接</button>
                    <button type="button" class="format-btn" id="bbcodeBtn">BBCode</button>
                    <button type="button" class="format-btn" id="markdownBtn">Markdown</button>
                    <button type="button" class="format-btn" id="htmlBtn">HTML</button>
                </div>
                <textarea class="result-textarea" id="fileLink" placeholder="上传后的链接将显示在这里..." readonly></textarea>
            </div>
            
            <div class="history-panel" id="historyPanel">
                <div class="history-title">
                    <span>上传历史</span>
                    <button class="control-btn" id="clearHistoryBtn" title="清空历史">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
                <div id="cacheContent"></div>
            </div>
            
            <div class="stats">
                <div class="stat-item">
                    <div class="stat-value" id="totalUploads">0</div>
                    <div class="stat-label">总上传</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value" id="todayUploads">0</div>
                    <div class="stat-label">今日上传</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value" id="totalSize">0MB</div>
                    <div class="stat-label">总大小</div>
                </div>
            </div>
        </div>
        
        <div class="footer">
            <p>项目开源于 GitHub - <a href="https://github.com/0-RTT/telegraph" target="_blank" rel="noopener noreferrer">0-RTT/telegraph</a></p>
        </div>
    </div>

    <script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.6.0/jquery.min.js" integrity="sha512-894YE6QWD5I59HgZOGReFYm4dnWc1Qt5NtvYSaNcOP+u1T9qYdvdihz0PPSiiqn/+/3e7Jo4EaG7TubfWGUrMQ==" crossorigin="anonymous" referrerpolicy="no-referrer"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/bootstrap-fileinput/5.2.7/js/fileinput.min.js" integrity="sha512-CCLv901EuJXf3k0OrE5qix8s2HaCDpjeBERR2wVHUwzEIc7jfiK9wqJFssyMOc1lJ/KvYKsDenzxbDTAQ4nh1w==" crossorigin="anonymous" referrerpolicy="no-referrer"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/bootstrap-fileinput/5.2.7/js/locales/zh.min.js" integrity="sha512-IizKWmZY3aznnbFx/Gj8ybkRyKk7wm+d7MKmEgOMRQDN1D1wmnDRupfXn6X04pwIyKFWsmFVgrcl0j6W3Z5FDQ==" crossorigin="anonymous" referrerpolicy="no-referrer"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/toastr.js/2.1.4/toastr.min.js" integrity="sha512-lbwH47l/tPXJYG9AcFNoJaTMhGvYWhVM9YI43CT+uteTRRaiLCui8snIgyAN8XWgNjNhCqlAUdzZptso6OCoFQ==" crossorigin="anonymous" referrerpolicy="no-referrer"></script>
    
    <script>
        // 配置Toastr
        toastr.options = {
            closeButton: true,
            progressBar: true,
            positionClass: "toast-top-right",
            timeOut: 3000,
            extendedTimeOut: 1000,
            showEasing: "swing",
            hideEasing: "linear",
            showMethod: "fadeIn",
            hideMethod: "fadeOut"
        };
        
        async function fetchBingImages() {
            const response = await fetch('/bing-images');
            const data = await response.json();
            return data.data.map(image => image.url);
        }

        async function setBackgroundImages() {
            try {
                const images = await fetchBingImages();
                const backgroundDiv = document.getElementById('background');
                if (images.length > 0) {
                    backgroundDiv.style.backgroundImage = 'url(' + images[0] + ')';
                }
                let index = 0;
                let currentBackgroundDiv = backgroundDiv;
                setInterval(() => {
                    const nextIndex = (index + 1) % images.length;
                    const nextBackgroundDiv = document.createElement('div');
                    nextBackgroundDiv.className = 'background next';
                    nextBackgroundDiv.style.backgroundImage = 'url(' + images[nextIndex] + ')';
                    document.body.appendChild(nextBackgroundDiv);
                    nextBackgroundDiv.style.opacity = 0;
                    setTimeout(() => {
                        nextBackgroundDiv.style.opacity = 1;
                    }, 50);
                    setTimeout(() => {
                        document.body.removeChild(currentBackgroundDiv);
                        currentBackgroundDiv = nextBackgroundDiv;
                        index = nextIndex;
                    }, 1500);
                }, 8000);
            } catch (error) {
                console.error('设置背景图片失败:', error);
            }
        }

        $(document).ready(function() {
            let originalImageURLs = [];
            let isCacheVisible = false;
            let enableCompression = true;
            let currentFormat = 'url';
            
            // 初始化统计信息
            updateStats();
            
            // 初始化文件输入
            initFileInput();
            
            // 设置背景图片
            setBackgroundImages();
            
            // 设置控制按钮提示
            $('#compressionToggleBtn').attr('title', enableCompression ? '关闭压缩' : '开启压缩');
            
            // 压缩切换按钮事件
            $('#compressionToggleBtn').on('click', function() {
                enableCompression = !enableCompression;
                const icon = $(this).find('i');
                const tooltipText = enableCompression ? '关闭压缩' : '开启压缩';
                $(this).attr('title', tooltipText);
                
                if (enableCompression) {
                    icon.removeClass('fa-expand-arrows-alt').addClass('fa-compress-arrows-alt');
                    toastr.info('已开启图片压缩');
                } else {
                    icon.removeClass('fa-compress-arrows-alt').addClass('fa-expand-arrows-alt');
                    toastr.info('已关闭图片压缩');
                }
            });
            
            // 信息按钮事件
            $('#infoBtn').on('click', function() {
                toastr.info('支持拖放上传，可同时上传多个文件。开启压缩可减小图片体积。', '使用说明', {timeOut: 5000});
            });
            
            // 清空历史按钮事件
            $('#clearHistoryBtn').on('click', function() {
                if (confirm('确定要清空所有上传历史吗？此操作不可恢复。')) {
                    localStorage.removeItem('uploadCache');
                    $('#cacheContent').empty();
                    $('#cacheContent').append('<div class="empty-history">暂无上传记录</div>');
                    updateStats();
                    toastr.success('历史记录已清空');
                }
            });
            
            // 格式化按钮事件
            $('.format-btn').on('click', function() {
                $('.format-btn').removeClass('active');
                $(this).addClass('active');
                currentFormat = $(this).attr('id').replace('Btn', '');
                updateFileLinkDisplay();
            });
            
            function initFileInput() {
                $("#fileInput").fileinput({
                    theme: 'fa',
                    language: 'zh',
                    browseClass: "btn btn-primary btn-file",
                    removeClass: "btn btn-danger",
                    showUpload: false,
                    showPreview: true,
                    showRemove: true,
                    showCancel: true,
                    showCaption: true,
                    dropZoneEnabled: true,
                    dropZoneTitle: '拖放文件到这里或点击上传',
                    fileActionSettings: {
                        showRemove: true,
                        showUpload: false,
                        showZoom: false,
                        showDrag: false
                    },
                    allowedFileTypes: ['image', 'video'],
                    allowedFileExtensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'mp4', 'avi', 'mov'],
                    maxFileSize: ${maxSizeMB * 1024},
                    maxFilesNum: 10,
                    previewSettings: {
                        image: {width: "auto", height: "160px"},
                        video: {width: "auto", height: "160px"}
                    }
                }).on('filebatchselected', handleFileSelection)
                  .on('fileclear', handleFileClear)
                  .on('fileloaded', function(event, file, previewId, index, reader) {
                      $('#uploadArea').addClass('active');
                  })
                  .on('filecleared', function(event) {
                      $('#uploadArea').removeClass('active');
                      $('#resultsPanel').removeClass('show');
                      originalImageURLs = [];
                  });
            }

            async function handleFileSelection() {
                const files = $('#fileInput')[0].files;
                $('#progressContainer').show();
                $('#progressBar').css('width', '0%');
                
                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    const fileHash = await calculateFileHash(file);
                    const cachedData = getCachedData(fileHash);
                    
                    // 更新进度条
                    $('#progressBar').css('width', ((i + 1) / files.length * 100) + '%');
                    
                    if (cachedData) {
                        handleCachedFile(cachedData);
                    } else {
                        await uploadFile(file, fileHash);
                    }
                }
                
                // 上传完成后隐藏进度条
                setTimeout(() => {
                    $('#progressContainer').hide();
                    $('#progressBar').css('width', '0%');
                }, 1000);
            }

            function getCachedData(fileHash) {
                const cacheData = JSON.parse(localStorage.getItem('uploadCache')) || [];
                return cacheData.find(item => item.hash === fileHash);
            }

            function handleCachedFile(cachedData) {
                if (!originalImageURLs.includes(cachedData.url)) {
                    originalImageURLs.push(cachedData.url);
                    updateFileLinkDisplay();
                    toastr.info('已从缓存加载: ' + cachedData.fileName);
                }
            }

            function updateFileLinkDisplay() {
                if (originalImageURLs.length === 0) return;
                
                $('#resultsPanel').addClass('show');
                let formattedLinks = '';
                
                switch (currentFormat) {
                    case 'url':
                        formattedLinks = originalImageURLs.join('\\n\\n');
                        break;
                    case 'bbcode':
                        formattedLinks = originalImageURLs.map(url => '[img]' + url + '[/img]').join('\\n\\n');
                        break;
                    case 'markdown':
                        formattedLinks = originalImageURLs.map(url => '![](' + url + ')').join('\\n\\n');
                        break;
                    case 'html':
                        formattedLinks = originalImageURLs.map(url => '<img src="' + url + '" alt="Image">').join('\\n\\n');
                        break;
                }
                
                $('#fileLink').val(formattedLinks);
                adjustTextareaHeight($('#fileLink')[0]);
                
                // 自动复制到剪贴板
                copyToClipboardWithToastr(formattedLinks);
            }

            async function calculateFileHash(file) {
                const arrayBuffer = await file.arrayBuffer();
                const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
                const hashArray = Array.from(new Uint8Array(hashBuffer));
                return hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
            }

            async function uploadFile(file, fileHash) {
                try {
                    toastr.info('正在上传: ' + file.name, '上传中', {timeOut: 0});
                    
                    // 压缩图片（如果启用）
                    if (file.type.startsWith('image/') && file.type !== 'image/gif' && enableCompression) {
                        toastr.info('正在压缩: ' + file.name, '压缩中', {timeOut: 0});
                        file = await compressImage(file);
                    }

                    const formData = new FormData();
                    formData.append('file', file, file.name);

                    const uploadResponse = await fetch('/upload', {
                        method: 'POST',
                        body: formData
                    });

                    const responseData = await handleUploadResponse(uploadResponse);
                    if (responseData.error) {
                        toastr.error(responseData.error, '上传失败');
                    } else {
                        originalImageURLs.push(responseData.data);
                        updateFileLinkDisplay();
                        toastr.success(file.name + ' 上传成功！');
                        saveToLocalCache(responseData.data, file.name, fileHash);
                        updateStats();
                    }
                } catch (error) {
                    console.error('处理文件时出现错误:', error);
                    toastr.error('文件处理失败: ' + file.name);
                } finally {
                    toastr.clear();
                }
            }

            async function handleUploadResponse(response) {
                if (response.ok) {
                    return await response.json();
                } else {
                    const errorData = await response.json();
                    return { error: errorData.error };
                }
            }

            // 拖放区域事件
            const uploadArea = document.getElementById('uploadArea');
            
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                uploadArea.addEventListener(eventName, preventDefaults, false);
            });
            
            function preventDefaults(e) {
                e.preventDefault();
                e.stopPropagation();
            }
            
            ['dragenter', 'dragover'].forEach(eventName => {
                uploadArea.addEventListener(eventName, highlight, false);
            });
            
            ['dragleave', 'drop'].forEach(eventName => {
                uploadArea.addEventListener(eventName, unhighlight, false);
            });
            
            function highlight() {
                uploadArea.classList.add('active');
            }
            
            function unhighlight() {
                uploadArea.classList.remove('active');
            }
            
            uploadArea.addEventListener('drop', handleDrop, false);
            
            function handleDrop(e) {
                const dt = e.dataTransfer;
                const files = dt.files;
                
                const dataTransfer = new DataTransfer();
                const existingFiles = $('#fileInput')[0].files;
                
                for (let i = 0; i < existingFiles.length; i++) {
                    dataTransfer.items.add(existingFiles[i]);
                }
                
                for (let i = 0; i < files.length; i++) {
                    dataTransfer.items.add(files[i]);
                }
                
                $('#fileInput')[0].files = dataTransfer.files;
                $('#fileInput').trigger('change');
            }

            // 粘贴事件
            $(document).on('paste', async function(event) {
                const clipboardData = event.originalEvent.clipboardData;
                if (clipboardData && clipboardData.items) {
                    for (let i = 0; i < clipboardData.items.length; i++) {
                        const item = clipboardData.items[i];
                        if (item.kind === 'file') {
                            const pasteFile = item.getAsFile();
                            const dataTransfer = new DataTransfer();
                            const existingFiles = $('#fileInput')[0].files;
                            
                            for (let j = 0; j < existingFiles.length; j++) {
                                dataTransfer.items.add(existingFiles[j]);
                            }
                            
                            dataTransfer.items.add(pasteFile);
                            $('#fileInput')[0].files = dataTransfer.files;
                            $('#fileInput').trigger('change');
                            break;
                        }
                    }
                }
            });

            async function compressImage(file, quality = 0.75) {
                return new Promise((resolve) => {
                    const image = new Image();
                    image.onload = () => {
                        const targetWidth = image.width;
                        const targetHeight = image.height;
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        canvas.width = targetWidth;
                        canvas.height = targetHeight;
                        ctx.drawImage(image, 0, 0, targetWidth, targetHeight);
                        canvas.toBlob((blob) => {
                            const compressedFile = new File([blob], file.name, { type: 'image/jpeg' });
                            resolve(compressedFile);
                        }, 'image/jpeg', quality);
                    };
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        image.src = event.target.result;
                    };
                    reader.readAsDataURL(file);
                });
            }

            function handleFileClear(event) {
                $('#resultsPanel').removeClass('show');
                originalImageURLs = [];
            }

            function adjustTextareaHeight(textarea) {
                textarea.style.height = 'auto';
                textarea.style.height = (textarea.scrollHeight > 200 ? 200 : textarea.scrollHeight) + 'px';
                if (textarea.scrollHeight > 200) {
                    textarea.style.overflowY = 'auto';
                } else {
                    textarea.style.overflowY = 'hidden';
                }
            }

            function copyToClipboardWithToastr(text) {
                const input = document.createElement('textarea');
                input.value = text;
                document.body.appendChild(input);
                input.select();
                document.execCommand('copy');
                document.body.removeChild(input);
                
                const formatNames = {
                    'url': 'URL链接',
                    'bbcode': 'BBCode',
                    'markdown': 'Markdown',
                    'html': 'HTML'
                };
                
                toastr.success(formatNames[currentFormat] + ' 已复制到剪贴板', '', { timeOut: 2000 });
            }

            function saveToLocalCache(url, fileName, fileHash) {
                const timestamp = new Date().toLocaleString('zh-CN', { hour12: false });
                const cacheData = JSON.parse(localStorage.getItem('uploadCache')) || [];
                cacheData.push({ url, fileName, hash: fileHash, timestamp });
                localStorage.setItem('uploadCache', JSON.stringify(cacheData));
            }

            $('#viewCacheBtn').on('click', function() {
                const cacheData = JSON.parse(localStorage.getItem('uploadCache')) || [];
                const historyPanel = $('#historyPanel');
                const cacheContent = $('#cacheContent');
                
                cacheContent.empty();
                
                if (isCacheVisible) {
                    historyPanel.removeClass('show');
                    isCacheVisible = false;
                } else {
                    if (cacheData.length > 0) {
                        cacheData.reverse().forEach((item, index) => {
                            if (index < 20) { // 只显示最近20条记录
                                const listItem = $(`
                                    <div class="history-item">
                                        <div class="history-info">
                                            <div class="history-name">${item.fileName}</div>
                                            <div class="history-time">${item.timestamp}</div>
                                        </div>
                                        <div class="history-actions">
                                            <button class="history-action view-btn" title="查看">
                                                <i class="fas fa-eye"></i>
                                            </button>
                                            <button class="history-action copy-btn" title="复制链接">
                                                <i class="fas fa-copy"></i>
                                            </button>
                                        </div>
                                    </div>
                                `);
                                
                                listItem.find('.view-btn').data('url', item.url);
                                listItem.find('.copy-btn').data('url', item.url);
                                
                                cacheContent.append(listItem);
                            }
                        });
                    } else {
                        cacheContent.append('<div class="empty-history">暂无上传记录</div>');
                    }
                    historyPanel.addClass('show');
                    isCacheVisible = true;
                }
            });

            // 历史记录操作事件
            $(document).on('click', '.history-item .view-btn', function() {
                const url = $(this).data('url');
                window.open(url, '_blank');
            });
            
            $(document).on('click', '.history-item .copy-btn', function() {
                const url = $(this).data('url');
                const input = document.createElement('textarea');
                input.value = url;
                document.body.appendChild(input);
                input.select();
                document.execCommand('copy');
                document.body.removeChild(input);
                toastr.success('链接已复制到剪贴板');
            });
            
            $(document).on('click', '.history-item', function() {
                const url = $(this).find('.view-btn').data('url');
                originalImageURLs = [url];
                $('#resultsPanel').addClass('show');
                updateFileLinkDisplay();
            });
            
            // 更新统计信息
            function updateStats() {
                const cacheData = JSON.parse(localStorage.getItem('uploadCache')) || [];
                const today = new Date().toLocaleDateString('zh-CN');
                const todayItems = cacheData.filter(item => {
                    const itemDate = new Date(item.timestamp.replace(/\\//g, '-')).toLocaleDateString('zh-CN');
                    return itemDate === today;
                });
                
                $('#totalUploads').text(cacheData.length);
                $('#todayUploads').text(todayItems.length);
                
                // 计算总大小（模拟）
                const totalSizeMB = (cacheData.length * 0.5).toFixed(1);
                $('#totalSize').text(totalSizeMB + 'MB');
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
    if (!authenticate(request， USERNAME, PASSWORD)) {
        return new Response('Unauthorized'， {
            status: 401，
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
    <title>图库管理</title>
    <link rel="icon" href="https://p1.meituan.net/csc/c195ee91001e783f39f41ffffbbcbd484286.ico" type="image/x-icon">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        :root {
            --primary-color: #4361ee;
            --secondary-color: #3f37c9;
            --accent-color: #4895ef;
            --light-color: #f8f9fa;
            --dark-color: #212529;
            --success-color: #4cc9f0;
            --warning-color: #f72585;
        }
        
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            margin: 0; 
            padding: 20px; 
            min-height: 100vh;
        }
        
        .header { 
            position: sticky; 
            top: 0; 
            background: rgba(255, 255, 255, 0.9);
            backdrop-filter: blur(10px);
            z-index: 1000; 
            display: flex; 
            justify-content: space-between; 
            align-items: center; 
            margin-bottom: 20px; 
            padding: 15px 20px; 
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); 
            border-radius: 12px; 
            flex-wrap: wrap; 
        }
        
        .header-left { 
            flex: 1; 
            color: var(--dark-color);
            font-weight: 500;
        }
        
        .header-right { 
            display: flex; 
            gap: 10px; 
            justify-content: flex-end; 
            flex: 1; 
            flex-wrap: wrap; 
        }
        
        .gallery { 
            display: grid; 
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); 
            gap: 16px; 
        }
        
        .media-container { 
            position: relative; 
            overflow: hidden; 
            border-radius: 12px; 
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); 
            aspect-ratio: 1 / 1; 
            transition: transform 0.3s, box-shadow 0.3s; 
            background: white;
        }
        
        .media-type { 
            position: absolute; 
            top: 10px; 
            left: 10px; 
            background-color: rgba(0, 0, 0, 0.7); 
            color: white; 
            padding: 5px 10px; 
            border-radius: 20px; 
            font-size: 12px; 
            z-index: 10; 
            cursor: pointer; 
        }
        
        .upload-time { 
            position: absolute; 
            bottom: 10px; 
            left: 10px; 
            background-color: rgba(255, 255, 255, 0.9); 
            padding: 5px 10px; 
            border-radius: 20px; 
            color: #000; 
            font-size: 12px; 
            z-index: 10; 
            display: none; 
        }
        
        .media-container:hover { 
            transform: scale(1.05); 
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2); 
        }
        
        .media-container:hover .upload-time {
            display: block;
        }
        
        .gallery-image { 
            width: 100%; 
            height: 100%; 
            object-fit: contain; 
            transition: opacity 0.3s; 
            opacity: 0; 
        }
        
        .gallery-image.loaded { 
            opacity: 1; 
        }
        
        .media-container.selected { 
            border: 2px solid var(--primary-color); 
            background-color: rgba(67, 97, 238, 0.1); 
        }
        
        .footer { 
            margin-top: 20px; 
            text-align: center; 
            font-size: 18px; 
            color: white; 
            padding: 20px;
        }
        
        .delete-button, .copy-button { 
            background-color: var(--warning-color); 
            color: white; 
            border: none; 
            border-radius: 20px; 
            padding: 10px 20px; 
            cursor: pointer; 
            transition: background-color 0.3s; 
            width: auto; 
            font-weight: 500;
        }
        
        .delete-button:hover, .copy-button:hover { 
            background-color: #d11a6d; 
            transform: translateY(-2px);
        }
        
        .hidden { 
            display: none; 
        }
        
        .dropdown { 
            position: relative; 
            display: inline-block; 
        }
        
        .dropdown-content { 
            display: none; 
            position: absolute; 
            background-color: #f9f9f9; 
            min-width: 160px; 
            box-shadow: 0px 8px 16px 0px rgba(0,0,0,0.2); 
            z-index: 1; 
            border-radius: 8px; 
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); 
        }
        
        .dropdown-content button { 
            color: black; 
            padding: 12px 16px; 
            text-decoration: none; 
            display: block; 
            background: none; 
            border: none; 
            width: 100%; 
            text-align: left; 
            cursor: pointer;
            transition: background-color 0.2s;
        }
        
        .dropdown-content button:hover { 
            background-color: #f1f1f1; 
        }
        
        .dropdown:hover .dropdown-content { 
            display: block; 
        }
        
        .select-all-button {
            background-color: var(--primary-color);
            color: white;
            border: none;
            border-radius: 20px;
            padding: 10px 20px;
            cursor: pointer;
            transition: background-color 0.3s;
            font-weight: 500;
        }
        
        .select-all-button:hover {
            background-color: var(--secondary-color);
            transform: translateY(-2px);
        }
        
        @media (max-width: 768px) {
            .header-left, .header-right { 
                flex: 1 1 100%; 
                justify-content: flex-start; 
            }
            
            .header-right { 
                margin-top: 10px; 
            }
            
            .gallery { 
                grid-template-columns: repeat(2, 1fr); 
            }
            
            body {
                padding: 10px;
            }
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
            <button id="select-all-button" class="select-all-button" onclick="selectAllImages()">全选</button>
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
        await cache。put(cacheKey, notFoundResponse.clone());
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
            filePath = fileData。result.file_path;
            break;
        }
        attempts++;
    }
    
    if (!filePath) {
        const notFoundResponse = new Response('未找到FilePath'， { status: 404 });
        await cache。put(cacheKey， notFoundResponse.clone());
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

// 随机图片API处理函数
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
            return new Response(JSON。stringify({
                url: randomImage。url,
                fileId: randomImage。fileId，
                输入: 'image'
            }), {
                headers: { 'Content-Type': 'application/json' }
            });
        } else {
            // 否则重定向到图片URL
            return new Response(null， {
                status: 302，
                headers: {
                    'Location': randomImage.url,
                    'Cache-Control': 'no-cache'
                }
            });
        }
        
    } catch (error) {
        console。error('随机图片API错误:'， error);
        return new Response(JSON.stringify({ 
            error: '获取随机图片失败' 
        })， { 
            status: 500, 
            headers: { 'Content-Type': 'application/json' } 
        });
    }
}

// 获取图片媒体数据（只返回图片文件）
async function fetchImageMediaData(DATABASE) {
    const result = await DATABASE.prepare('SELECT url, fileId FROM media')。全部();
    const mediaData = result.results.map(row => ({
        fileId: row。fileId,
        url: row。url，
        timestamp: parseInt(row。url.split('/').pop().split('.')[0])
    }));
    
    // 过滤出图片文件（基于文件扩展名）
    const imageExtensions = [
        'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tiff', 'svg'
    ];
    
    const imageMedia = mediaData.filter(media => {
        const fileExtension = media。url.split('.')。pop()。toLowerCase();
        return imageExtensions.includes(fileExtension);
    });
    
    return imageMedia;
}

// 增强的文件类型检测函数
function isImageFile(url) {
    const imageExtensions = [
        'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tiff', 'svg'
    ];
    
    const fileExtension = url.split('.').pop()。toLowerCase();
    
    // 基础扩展名检查
    if (!imageExtensions。includes(fileExtension)) {
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
