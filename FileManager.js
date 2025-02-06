class FileManager {
    constructor() {
        this.imageDirectory = null;
        this.googleDriveStorage = new GoogleDriveStorage();
    }

    async initializeFileSystem() {
        return new Promise((resolve, reject) => {
            if (!window.cordova || !window.cordova.file) {
                console.log('Not in Cordova environment');
                resolve(null);
                return;
            }

            // Use external storage for persistent image storage
            const imageDir = window.cordova.file.externalDataDirectory || 
                             window.cordova.file.dataDirectory;

            window.resolveLocalFileSystemURL(imageDir, (fileSystem) => {
                fileSystem.getDirectory('TaladroImages', { create: true }, (dir) => {
                    this.imageDirectory = dir;
                    resolve(dir);
                }, (error) => {
                    console.error('Error creating image directory', error);
                    reject(error);
                });
            }, (error) => {
                console.error('Error resolving file system', error);
                reject(error);
            });
        });
    }

    async saveImage(imageFile) {
        return new Promise((resolve, reject) => {
            if (!this.imageDirectory) {
                reject(new Error('File system not initialized'));
                return;
            }

            const fileName = `image_${Date.now()}.jpg`;

            this.imageDirectory.getFile(fileName, { create: true }, (fileEntry) => {
                fileEntry.createWriter((fileWriter) => {
                    fileWriter.onwriteend = () => {
                        resolve(fileEntry.toURL());
                    };

                    fileWriter.onerror = (error) => {
                        reject(error);
                    };

                    fileWriter.write(imageFile);
                });
            }, (error) => {
                reject(error);
            });
        });
    }

    async loadImage(imagePath) {
        return new Promise((resolve, reject) => {
            if (!imagePath) {
                reject(new Error('No image path provided'));
                return;
            }

            window.resolveLocalFileSystemURL(imagePath, (fileEntry) => {
                fileEntry.file((file) => {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        resolve(reader.result);
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                }, reject);
            }, reject);
        });
    }

    async deleteImage(imagePath) {
        return new Promise((resolve, reject) => {
            if (!imagePath) {
                reject(new Error('No image path provided'));
                return;
            }

            window.resolveLocalFileSystemURL(imagePath, (fileEntry) => {
                fileEntry.remove(resolve, reject);
            }, reject);
        });
    }

    async saveDataToDrive(filename, data) {
        try {
            // Ensure authentication
            await this.googleDriveStorage.initializeGoogleDriveAuth();

            // Convert data to blob
            const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });

            // Create FormData for upload
            const formData = new FormData();
            const metadata = {
                name: filename,
                parents: [this.googleDriveStorage.FOLDER_ID]
            };
            formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
            formData.append('file', blob);

            // Perform upload
            const response = await fetch(
                'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.googleDriveStorage.accessToken}`
                    },
                    body: formData
                }
            );

            if (!response.ok) {
                throw new Error('Failed to upload to Google Drive');
            }

            return await response.json();
        } catch (error) {
            console.error('Google Drive save error:', error);
            throw error;
        }
    }

    async loadDataFromDrive(filename) {
        try {
            // Ensure authentication
            await this.googleDriveStorage.initializeGoogleDriveAuth();

            // Search for the file
            const searchResponse = await fetch(
                `https://www.googleapis.com/drive/v3/files?q=name='${filename}' and '${this.googleDriveStorage.FOLDER_ID}' in parents`,
                {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${this.googleDriveStorage.accessToken}`
                    }
                }
            );

            const searchResult = await searchResponse.json();

            if (searchResult.files.length === 0) {
                return null;
            }

            // Download the file
            const fileId = searchResult.files[0].id;
            const downloadResponse = await fetch(
                `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
                {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${this.googleDriveStorage.accessToken}`
                    }
                }
            );

            return await downloadResponse.json();
        } catch (error) {
            console.error('Google Drive load error:', error);
            throw error;
        }
    }
}

class GoogleDriveStorage {
    constructor() {
        this.CLIENT_ID = 'YOUR_GOOGLE_DRIVE_CLIENT_ID';
        this.API_KEY = 'YOUR_GOOGLE_DRIVE_API_KEY';
        this.FOLDER_ID = '15dSIS-275T2PMnTfDX4SGpq89er1FuI0';
        this.SCOPES = 'https://www.googleapis.com/auth/drive.file';
    }

    async initializeGoogleDriveAuth() {
        return new Promise((resolve, reject) => {
            // Check if Cordova and Google Sign-In plugin are available
            if (!window.cordova || !window.plugins || !window.plugins.googleplus) {
                reject(new Error('Google Sign-In plugin not available'));
                return;
            }

            window.plugins.googleplus.login(
                {
                    scopes: this.SCOPES,
                    webClientId: this.CLIENT_ID,
                    offline: true
                },
                (obj) => {
                    // Successfully logged in
                    this.accessToken = obj.accessToken;
                    resolve(obj);
                },
                (msg) => {
                    // Login failed
                    reject(new Error('Google Sign-In failed: ' + msg));
                }
            );
        });
    }

    async saveDataToDrive(filename, data) {
        try {
            // Ensure authentication
            await this.initializeGoogleDriveAuth();

            // Convert data to blob
            const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });

            // Create FormData for upload
            const formData = new FormData();
            const metadata = {
                name: filename,
                parents: [this.FOLDER_ID]
            };
            formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
            formData.append('file', blob);

            // Perform upload
            const response = await fetch(
                'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`
                    },
                    body: formData
                }
            );

            if (!response.ok) {
                throw new Error('Failed to upload to Google Drive');
            }

            return await response.json();
        } catch (error) {
            console.error('Google Drive save error:', error);
            throw error;
        }
    }

    async loadDataFromDrive(filename) {
        try {
            // Ensure authentication
            await this.initializeGoogleDriveAuth();

            // Search for the file
            const searchResponse = await fetch(
                `https://www.googleapis.com/drive/v3/files?q=name='${filename}' and '${this.FOLDER_ID}' in parents`,
                {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`
                    }
                }
            );

            const searchResult = await searchResponse.json();

            if (searchResult.files.length === 0) {
                return null;
            }

            // Download the file
            const fileId = searchResult.files[0].id;
            const downloadResponse = await fetch(
                `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
                {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`
                    }
                }
            );

            return await downloadResponse.json();
        } catch (error) {
            console.error('Google Drive load error:', error);
            throw error;
        }
    }
}

// Global FileManager instance
const fileManager = new FileManager();