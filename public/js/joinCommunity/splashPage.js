document.addEventListener('DOMContentLoaded', function() {
    const btn = document.getElementById('join-community-btn');
    btn.addEventListener('click', function() {
        // Use GET to navigate to /join
        //TODO: change name to RESTful
        window.location.href = '/join';
    });
});
