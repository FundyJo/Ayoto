// Modules to control application life and create native browser window
//added MAL Thumbnail support for RPC
const {app, BrowserWindow, session, globalShortcut} = require('electron')
const path = require('path')
const {ElectronBlocker} = require('@cliqz/adblocker-electron');
const fetch = require('cross-fetch');
const client = require('discord-rich-presence')('1144937172194037901');
const Store = require('electron-store');
const store = new Store();
const malScraper = require('mal-scraper')

require('update-electron-app')()

//stop it from blocking stuffs
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = '1';


//intilize mainWindow so it can be refrenced everywhere
let mainWindow = null;

//intilize currentURL
let currentURL;
let details = 'In main menu';
let staterpc;
let playON;

let Thumbnail = 'rpc';

let buttonList = [
    {
        label: `Get Ayoto`,
        url: `https://www.github.com/zoeeechu`,
    },
]


//Presistance Varaibles
let setUrl
pr = store.get('p');

if (pr != null) {
    if (pr.includes("aniworld.to/anime/stream")) {
        // Extract anime name and episode number from the URL
        let urlParts = pr.split('/');
        let animeName = urlParts[5].replaceAll('-', ' ');

        let seasonNumber = "";
        let episodeNumber = "";

        if (urlParts.length >= 8) {
            if (urlParts[6].startsWith('staffel-')) {
                seasonNumber = urlParts[6].replace('staffel-', '');
            }

            if (urlParts[7].startsWith('episode-')) {
                episodeNumber = urlParts[7].replace('episode-', '');
            }
        }

        // Update the RPC status with the extracted information
        details = "Watching: " + capitalize(animeName);

        if (seasonNumber && episodeNumber) {
            staterpc = "Watching Season " + seasonNumber + " Episode " + episodeNumber;
            buttonList = [
                {
                    label: `Get Ayoto`,
                    url: `https://www.github.com/zoeeechu`,
                },
                {
                    label: `Watch Anime Now`,
                    url: `https://www.github.com/zoeeechu`,
                },
            ]
        } else {
            staterpc = "Looking by ...";
        }

        playON = "play";

        updateP();
    } else if (pr.includes("aniworld.to/search")) {
        Thumbnail = 'rpc';
        details = 'Searching...';
        staterpc = undefined;
        playON = undefined;
        updateP();
    } else {
        Thumbnail = 'rpc';
        details = 'In main menu';
        staterpc = undefined;
        playON = undefined;
        updateP();
    }
}

function capitalize(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function createWindow() {


    // Create the browser window.
    mainWindow = new BrowserWindow({
        width: 800,
        height: 550,
        webPreferences: {
            allowEval: false, // This is the key!
            preload: path.join(__dirname, 'preload.js'),
            webSecurity: false,
            //icon: path.join(__dirname,'imgs/icon.png'),
        },
        autoHideMenuBar: true,
        icon: path.join(__dirname, '/imgs/icon.ico'), // Pfad zur Icon-Datei
        //titleBarStyle: 'hidden',
    })

    //Set title ;>
    mainWindow.setTitle('Aniworld Desktop');
    mainWindow.on('page-title-updated', function (e) {
        e.preventDefault()
    });

    //dont allow any other URLS other than gogoanime
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith('https://aniworld.to')) {
            mainWindow.loadURL(url); // Lade die URL im Hauptfenster
            return { action: 'deny' }; // Verhindere das Öffnen eines neuen Fensters
        }
        return { action: 'deny' };
    });


    //if presistance exists load it otherwise dont;
    if (pr == null) {
        setUrl = 'https://aniworld.to/beliebte-animes';
    } else {
        setUrl = pr
    }

    mainWindow.loadURL(setUrl).then(() => {
        mainWindow.webContents.on('did-frame-navigate', function () {

            // Inject on every Side Load the Scrollbar Hiding Feature
            mainWindow.webContents.insertCSS(`
                ::-webkit-scrollbar {
                    width: 0 !important;
                    height: 0 !important;
                    background-color: transparent !important;
                }

                ::-webkit-scrollbar-thumb {
                    background-color: transparent !important;
                }
            `);

            buttonList = [
                {
                    label: `Get Ayoto`,
                    url: `https://www.github.com/zoeeechu`,
                },
            ]

            currentURL = mainWindow.webContents.getURL();
            store.set('p', currentURL);

            if (currentURL.includes("aniworld.to/anime/stream")) {
                // Extract anime name and episode number from the URL
                let urlParts = currentURL.split('/');
                let animeName = urlParts[5].replaceAll('-', ' ');

                let seasonNumber = "";
                let episodeNumber = "";

                if (urlParts.length >= 8) {
                    if (urlParts[6].startsWith('staffel-')) {
                        seasonNumber = urlParts[6].replace('staffel-', '');
                    }

                    if (urlParts[7].startsWith('episode-')) {
                        episodeNumber = urlParts[7].replace('episode-', '');
                    }
                }

                // Update the RPC status with the extracted information
                details = "Watching: " + capitalize(animeName);

                if (seasonNumber && episodeNumber) {
                    staterpc = "Watching Season " + seasonNumber + " Episode " + episodeNumber;
                    buttonList = [
                        {
                            label: `Get Ayoto`,
                            url: `https://www.github.com/zoeeechu`,
                        },
                        {
                            label: `Watch Anime Now`,
                            url: `https://www.github.com/zoeeechu`,
                        },
                    ]
                } else {
                    staterpc = "Looking by ...";
                }

                playON = "play";

                updateP();
            } else if (currentURL.includes("aniworld.to/search")) {
                Thumbnail = 'rpc';
                details = 'Searching...';
                staterpc = undefined;
                playON = undefined;
                updateP();
            } else {
                Thumbnail = 'rpc';
                details = 'In main menu';
                staterpc = undefined;
                playON = undefined;
                updateP();
            }
        });
    })
    mainWindow.show()
    mainWindow.focus()

    //injecting CSS TEST WORKON LATER
    //mainWindow.webContents.insertCSS('.logo.show.ads-evt {content: url("https://github.com/zoeeechu/Ako/blob/main/logo.png?raw=true");}')
    //mainWindow.webContents.insertCSS('html, .wrapper_inside { overflow-y: scroll; padding-right: 0px; }')

    // Inject the css that Hide the Scrollbar :D
    mainWindow.webContents.insertCSS(`
      ::-webkit-scrollbar {
        width: 0 !important;
        height: 0 !important;
        background-color: transparent !important;
      }

      ::-webkit-scrollbar-thumb {
        background-color: transparent !important;
      }
    `);
}

app.whenReady().then(() => {

    updateP()

    // Register a shortcut listener for Ctrl + Shift + I
    globalShortcut.register('Control+Shift+I', () => {
        // When the user presses Ctrl + Shift + I, this function will get called
        // You can modify this function to do other things, but if you just want
        // to disable the shortcut, you can just return false
        return false;
    });


    //blocker
    ElectronBlocker.fromPrebuiltAdsAndTracking(fetch).then((blocker) => {
        blocker.enableBlockingInSession(session.defaultSession);
    });

    createWindow()


    app.on('activate', function () {
        // On macOS it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit()
})


// Ayoto = Discord RPC Main Logo
async function updateP() {
    client.updatePresence({
        state: staterpc,
        details: details,
        largeImageKey: Thumbnail,
        largeImageText: "Ayoto Aniworld client",
        smallImageKey: playON,
        instance: true,
        buttons: buttonList
    })
}
