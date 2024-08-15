// src/renderer/project-selection.js

const { ipcRenderer } = require('electron');

document.addEventListener('DOMContentLoaded', () => {
    const projectSelect = document.getElementById('project-select');
    const confirmButton = document.getElementById('confirm-project');

    ipcRenderer.invoke('list-projects').then((projects) => {
        console.log('Projects received:', projects);
        projects.forEach((project) => {
            const option = document.createElement('option');
            option.value = project.uuid;
            option.textContent = project.name;
            projectSelect.appendChild(option);
        });
    });

    confirmButton.addEventListener('click', () => {
        const selectedProjectId = projectSelect.value;
        if (selectedProjectId) {
            console.log('Confirming project selection:', selectedProjectId);
            ipcRenderer.invoke('confirm-project-selection', selectedProjectId)
                .then(result => {
                    console.log('Confirm project selection result:', result);
                })
                .catch(error => {
                    console.error('Error confirming project selection:', error);
                });
        } else {
            console.log('No project selected');
        }
    });
});