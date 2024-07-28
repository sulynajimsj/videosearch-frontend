import { initializeApp } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut, signInWithPopup, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-auth.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDHc7o9AaEXzPw-VmUYygEhvc8q69_EUmk",
    authDomain: "skmaiv2.firebaseapp.com",
    projectId: "skmaiv2",
    storageBucket: "skmaiv2.appspot.com",
    messagingSenderId: "164517374710",
    appId: "1:164517374710:web:8aa404747bbdf4dccf9ad7",
    measurementId: "G-RE1S15Q1HL"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// Check authentication state
onAuthStateChanged(auth, (user) => {
    if (user) {
        // User is signed in
        document.getElementById('app').style.display = 'block';
        document.getElementById('signOutBtn').style.display = 'block';
        document.getElementById('signInBtn').style.display = 'none';
        enableElements();
        initApp(user);
    } else {
        // No user is signed in
        document.getElementById('app').style.display = 'block';
        document.getElementById('signOutBtn').style.display = 'none';
        document.getElementById('signInBtn').style.display = 'block';
        disableElements();
    }
});

// Add event listener for sign-in button
document.getElementById('signInBtn').addEventListener('click', () => {
    signInWithPopup(auth, provider)
        .then((result) => {
            // Sign-in successful
            const user = result.user;
            console.log('User signed in:', user);
        }).catch((error) => {
            // Handle errors here
            console.error('Sign-in error:', error);
        });
});

// Add event listener for sign-out button
document.getElementById('signOutBtn').addEventListener('click', () => {
    signOut(auth).then(() => {
        // Sign-out successful
        console.log('User signed out');
        resetAppState();
    }).catch((error) => {
        // An error happened during sign-out
        console.error('Sign-out error:', error);
    });
});

function enableElements() {
    document.getElementById('youtubeLink').disabled = false;
    document.getElementById('startSession').disabled = false;
    document.getElementById('searchInput').disabled = false;
    document.getElementById('searchButton').disabled = false;
    document.getElementById('endSession').disabled = false;
}

function disableElements() {
    document.getElementById('youtubeLink').disabled = true;
    document.getElementById('startSession').disabled = true;
    document.getElementById('searchInput').disabled = true;
    document.getElementById('searchButton').disabled = true;
    document.getElementById('endSession').disabled = true;
}



function resetAppState() {
    // Reset the app state when user signs out
    document.getElementById('youtubeLink').value = '';
    document.getElementById('searchInput').value = '';
    document.getElementById('searchResults').innerHTML = '';
    showScreen('welcome-screen');
    disableElements();
}

function initApp(user) {
    let currentVideoUrl;
    let youtube_link;
    let sessionId;
    let player;

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

    function generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
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
        sessionId = generateSessionId();
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
            console.log(videoUrl)
            currentVideoUrl = videoUrl;
            
            return fetch('https://skmai-video-search-db90a7ab399b.herokuapp.com/youtubeVideoUpload', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    youtube_link: youtubeLink,
                    videoUrl: videoUrl,
                    userID: sessionId
                }),
            });
        })
        .then(response => response.json())
        .then(data => {
            const videoId = extractVideoId(youtubeLink);
            if (player && player.loadVideoById) {
                player.loadVideoById(videoId);
                showScreen('main-screen');
            } else {
                console.error('YouTube player not ready');
                // You might want to add some error handling here
            }
        })
        .catch((error) => {
            console.error('Error:', error);
            showScreen('welcome-screen');
            alert('An error occurred while processing the video. Please try again.');
        });
    }

    function searchVideos(query) {
        // Check if user is authenticated before allowing search
        if (!auth.currentUser) {
            alert('Please sign in to search.');
            return;
        }

        fetch('https://skmai-video-search-db90a7ab399b.herokuapp.com/semantic-search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_question: query,
                userID: sessionId
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
                    userID: sessionId
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
        const spinner = document.getElementById('downloadSpinner');
        const downloadBtn = document.getElementById('downloadClip');
        
        progressBar.style.width = '0%';
        spinner.style.display = 'block';
        downloadBtn.disabled = true;
        
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
            
            // Show completion alert
            document.getElementById('downloadCompleteAlert').style.display = 'block';
        })
        .catch(error => {
            console.error('Error:', error);
            alert('An error occurred while downloading the clip. Please try again.');
        })
        .finally(() => {
            spinner.style.display = 'none';
            downloadBtn.disabled = false;
            modal.style.display = "none";
        });
    }
    
    // Add event listener for the alert close button
    document.getElementById('closeAlert').addEventListener('click', function() {
        document.getElementById('downloadCompleteAlert').style.display = 'none';
    });

    onYouTubeIframeAPIReady();
 
    
}