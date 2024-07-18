let player;
let currentVideoUrl;
let youtube_link;

function onYouTubeIframeAPIReady() {
    player = new YT.Player('videoPlayer', {
        height: '360',
        width: '640',
        videoId: '',
        events: {
            'onReady': onPlayerReady
        }
    });
}

function onPlayerReady(event) {
    // Player is ready
}

document.getElementById('startSession').addEventListener('click', function() {
    const youtubeLink = document.getElementById('youtubeLink').value;
    youtube_link = youtubeLink; 
    startSession(youtubeLink);
});

document.getElementById('searchButton').addEventListener('click', function() {
    const searchQuery = document.getElementById('searchInput').value;
    searchVideos(searchQuery);
});

document.getElementById('endSession').addEventListener('click', endSession);

function startSession(youtubeLink) {
    showScreen('loading-screen');
    uploadVideo(youtubeLink);
}

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

function uploadVideo(youtubeLink) {
    fetch('https://skmai-video-search-db90a7ab399b.herokuapp.com/hostvideo', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            youtube_link: youtubeLink,
        }),
    })
    .then(response => response.json())
    .then(data => {
        const videoUrl = data.videoUrl;
        currentVideoUrl = videoUrl;
        
        return fetch('https://skmai-video-search-db90a7ab399b.herokuapp.com/youtubeVideoUpload', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                youtube_link: youtubeLink,
                videoUrl: videoUrl,
                userID: '2'
            }),
        });
    })
    .then(response => response.json())
    .then(data => {
        const videoId = extractVideoId(youtubeLink);
        player.loadVideoById(videoId);
        showScreen('main-screen');
    })
    .catch((error) => {
        console.error('Error:', error);
        showScreen('welcome-screen');
        alert('An error occurred while processing the video. Please try again.');
    });
}

function searchVideos(query) {
    fetch('https://skmai-video-search-db90a7ab399b.herokuapp.com/semantic-search', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            user_question: query,
            userID: '2'
        }),
    })
    .then(response => response.json())
    .then(data => {
        displayResults(data.docs);
    })
    .catch((error) => {
        console.error('Error:', error);
    });
}

function displayResults(results) {
    const resultsContainer = document.getElementById('searchResults');
    resultsContainer.innerHTML = '';

    results.forEach(result => {
        const card = document.createElement('div');
        card.className = 'result-card';
        const timestamp = formatTimestamp(result.metadata.start);
        card.innerHTML = `
            <h3>${result.metadata.videoTitle}</h3>
            <p>${result.page_content}</p>
            <div class="button-container">
                <button class="timestamp-button" data-video-id="${result.metadata.videoID}" data-start-time="${result.metadata.start}">${timestamp}</button>
                <button class="download-button" data-start-time="${result.metadata.start}" data-end-time="${result.metadata.end}">
                    <i class="fas fa-download"></i> Download Clip
                </button>
            </div>
        `;
        resultsContainer.appendChild(card);
    });

    document.querySelectorAll('.timestamp-button').forEach(button => {
        button.addEventListener('click', function() {
            const videoId = this.getAttribute('data-video-id');
            const startTime = this.getAttribute('data-start-time');
            player.loadVideoById({videoId: videoId, startSeconds: startTime});
        });
    });

    document.querySelectorAll('.download-button').forEach(button => {
        button.addEventListener('click', function() {
            const startTime = this.getAttribute('data-start-time');
            const endTime = this.getAttribute('data-end-time');
            openDownloadModal(startTime, endTime);
        });
    });
}

function formatTimestamp(seconds) {
    seconds = Math.floor(seconds);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    if (hours > 0) {
        return `${hours}:${padZero(minutes)}:${padZero(remainingSeconds)}`;
    } else {
        return `${minutes}:${padZero(remainingSeconds)}`;
    }
}

function padZero(num) {
    return num.toString().padStart(2, '0');
}

function extractVideoId(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

function endSession() {
    if (confirm('Are you sure you want to end this session? The video will be deleted.')) {
        // Call the API to delete the video from Firebase storage
        fetch('https://skmai-video-search-db90a7ab399b.herokuapp.com/delete-video', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                videoUrl: youtube_link,
                userID: '2'  // Assuming you're using a fixed userID for now
            }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                console.log('Video deleted successfully');
            } else {
                console.error('Failed to delete video:', data.message);
            }
        })
        .catch(error => {
            console.error('Error deleting video:', error);
        })
        .finally(() => {
            // Regardless of the deletion result, reset the UI
            showScreen('welcome-screen');
            player.stopVideo();
            document.getElementById('youtubeLink').value = '';
            document.getElementById('searchInput').value = '';
            document.getElementById('searchResults').innerHTML = '';
            currentVideoUrl = null;
        });
    }
}

// Modal functionality
const modal = document.getElementById('downloadModal');
const closeBtn = document.getElementsByClassName('close')[0];
const downloadBtn = document.getElementById('downloadClip');

closeBtn.onclick = function() {
    modal.style.display = "none";
}

window.onclick = function(event) {
    if (event.target == modal) {
        modal.style.display = "none";
    }
}

function openDownloadModal(startTime, endTime) {
    document.getElementById('endTimeInput').value = endTime;
    document.getElementById('endTimeInput').min = startTime;
    modal.style.display = "block";
    
    downloadBtn.onclick = function() {
        const newEndTime = document.getElementById('endTimeInput').value;
        downloadClip(currentVideoUrl, startTime, newEndTime);
    }
}

function downloadClip(videoUrl, startTime, endTime) {
    const progressBar = document.querySelector('.progress');
    progressBar.style.width = '0%';
    
    const formData = new FormData();
    formData.append('firebaseUrl', videoUrl);
    formData.append('start_time', startTime);
    formData.append('end_time', endTime);

    fetch('https://skmai-video-search-db90a7ab399b.herokuapp.com/download-clip', {
        method: 'POST',
        body: formData
    })
    .then(response => {
        const reader = response.body.getReader();
        const contentLength = +response.headers.get('Content-Length');
        let receivedLength = 0;
        let chunks = [];

        return new ReadableStream({
            start(controller) {
                function push() {
                    reader.read().then(({ done, value }) => {
                        if (done) {
                            controller.close();
                            return;
                        }
                        chunks.push(value);
                        receivedLength += value.length;
                        progressBar.style.width = `${(receivedLength / contentLength) * 100}%`;
                        controller.enqueue(value);
                        push();
                    });
                }
                push();
            }
        });
    })
    .then(stream => new Response(stream))
    .then(response => response.blob())
    .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = 'clip.mp4';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        modal.style.display = "none";
    })
    .catch(error => {
        console.error('Error:', error);
        alert('An error occurred while downloading the clip. Please try again.');
        modal.style.display = "none";
    });
}