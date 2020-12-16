// import _ from 'lodash'

// const data = require('../config.json');

// class AssetLoader {
//     constructor() {
//         this.loadedAssets = [];
//         this.fileData = [];
//         this.loadedFiles = [];
//     }

//     consverToBlobData(fileData) {
//         return new Promise((resolve, reject) => {
//             const fileReader = new FileReader();
//             fileReader.addEventListener('load', () => {
//                 const fileReadData = fileReader.result;
//                 resolve(fileReadData);
//             });
//             fileReader.addEventListener('error', () => {
//                 reject(`Something error in file loading :: STATE: ${fileReader.readyState}`);
//             });
//             fileReader.readAsDataURL(fileData);
//         })
//     }

//     async loading(name, index, result) {
//         const blobData = await result.blob();
//         const urlResult = await this.consverToBlobData(blobData)

//         this.fileData.push({
//             fileName: name,
//             data: urlResult
//         });
//     }

//     async loadAsset(callback = _.noop) {
//         const allFetchPromis = [];

//         _.forEach(data, album => {
//             console.log(album);
//             album.forEach(({ url, name }) => {
//                 console.log(' Loading file ');
//                 const bindedFunction = this.loading.bind(this, name);
//                 allFetchPromis.push(
//                     fetch(url, {
//                         cache: 'force-cache',
//                     }).then(bindedFunction));
//             })
//         });
//         try {
//             await Promise.all(allFetchPromis);
//             console.log('FETCHED ALL ASSETS');
//             callback();
//         } catch (error) {
//             console.error('Got this error:::SORRY ', error)
//         }
//     }
// }

// const assetLoader = new AssetLoader();
// export default assetLoader;