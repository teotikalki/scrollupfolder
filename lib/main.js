// Include SDK modules
const Self = require('sdk/self');
const SimplePrefs = require('sdk/simple-prefs');
const Tabs = require('sdk/tabs');
const Timers = require('sdk/timers');
const Url = require('sdk/url');
// Include urlbar module
const Urlbar = require('urlbar');
// Include URL button module
const UrlButton = require('urlbutton');
// Include URL panel module
const UrlPanel = require('urlpanel');

// Create packaging
if(!fr) var fr = {};
if(!fr.hardcoding) fr.hardcoding = {};
if(!fr.hardcoding.scrollupfolder) fr.hardcoding.scrollupfolder = {};

// Define Scroll Up Folder package
fr.hardcoding.scrollupfolder = {
	/**
	 * Add events.
	 * @param	event		Event.
	 */
	onLoad: function(event) {
		// Initialize urlbar event
		fr.hardcoding.scrollupfolder.urlbar.init();
		// Initialize url panel event
		fr.hardcoding.scrollupfolder.urlpanel.init();
		// Initialize urlbar button event
		fr.hardcoding.scrollupfolder.button.init();
		// Check update
		fr.hardcoding.scrollupfolder.checkUpdate();
		sendLog('chargement fini');
	},

	/**
	 * Check if add-on was updated.
	 */
	checkUpdate: function() {
		sendLog("checkUpdate");
		// Check first install
		console.log(Self.loadReason);
		if (Self.loadReason === 'install') {
			// Open the first run page
			Tabs.open('https://github.com/PerfectSlayer/scrollupfolder/wiki/FirstRun');
		} else
		// Check upgrade
		if (Self.loadReason === 'upgrade') {
			// Open the changelog page
			Tabs.open('https://github.com/PerfectSlayer/scrollupfolder/wiki/Changelog');
		}
	},

	/**
	 * Behavior of urlbar and his container.
	 */
	urlbar: {
		/**
		 * Prevent the URL panel to be shown.
		 */
		preventUrlPanelShowing: false,
		/**
		 * Timestamp of last scrolling event proceed.
		 */
		lastEventTimeStamp: 0,

		/**
		 * Initialize urlbar event handlers.
		 */
		init: function() {
			// Add scrolling event handling
			Urlbar.on('DOMMouseScroll', fr.hardcoding.scrollupfolder.urlbar.onScroll);
			// Add clicking event handling
			Urlbar.on('click', fr.hardcoding.scrollupfolder.urlbar.onClick);
			// Add key pressing down event handling
			Urlbar.on('keydown', fr.hardcoding.scrollupfolder.urlbar.onKeyDown);
			// Add key pressing up event handling
			Urlbar.on('keyup', fr.hardcoding.scrollupfolder.urlbar.onKeyUp);
		},

		/**
		 * Apply chosen URI.
		 * @param	event		Event.
		 */
		onClick: function(event) {
			// Check the mouse control mode
			if (SimplePrefs.prefs.controlMode == 2) {
				return;
			}
			// Getting chosen URL
			var url = Urlbar.getUrl(Tabs.activeTab.window);
			// Check event (only middle-click) and URL
			if (event.button != 1 || url == null || url.length <= 0) {
				return;
			}
			// Stop event propagation (for X server/linux)
			event.stopPropagation();
			// Add default HTTP protocol if missing
			var indexScheme = url.indexOf('://');
			var indexQuery = url.indexOf('?');
			if ((indexScheme == -1 && url.substr(0, 6) != 'about:') || (indexQuery !=- 1 && indexQuery < indexScheme)) {
				url = "http://"+url;
			}
			// Load URL
			fr.hardcoding.scrollupfolder.loadUrl(url, event);
		},

		/**
		 * Browse paths.
		 * @param	event		Event.
		 */
		onScroll: function(event) {
			// Check the mouse control mode
			if (SimplePrefs.prefs.controlMode == 2) {
				return;
			}
			// Get current tab
			var currentTab = Tabs.activeTab;
			// Check if paths were generated
			if (!currentTab.SUFPaths) {
				fr.hardcoding.scrollupfolder.processPaths(currentTab);
			}
			// Check if event was already proceed
			if (event.timeStamp == fr.hardcoding.scrollupfolder.urlbar.lastEventTimeStamp) {
				return;
			} else {
				// Save event timestamp
				fr.hardcoding.scrollupfolder.urlbar.lastEventTimeStamp = event.timeStamp;
			}
			// Stop event propagation (for other addon compatibility as Xclear)
			event.stopPropagation();
			// Go up in paths list
			var goUp = (event.detail < 0 && !SimplePrefs.prefs.invertScroll) || (event.detail > 0 && SimplePrefs.prefs.invertScroll);
			if (goUp && currentTab.SUFPointer < currentTab.SUFPaths.length-1) {
				currentTab.SUFPointer++;
			}
			// Go down in paths list
			else if (!goUp && currentTab.SUFPointer > 0) {
				currentTab.SUFPointer--;
			}
			// Get the new path to display
			var url = currentTab.SUFPaths[currentTab.SUFPointer];
			// Display the path to the urlbar URL
			Urlbar.setUrl(currentTab.window, url);
		},

		/**
		 * Display paths.
		 * @param	event		Event.
		 */
		onKeyDown: function(event) {
			// Get active window
			var window = Tabs.activeTab.window;
			// Check if URL panel is opened
			if (!UrlPanel.isOpened(window)) {
				return;
			}
			// Select next element in listbox
			if (event.keyCode == event.DOM_VK_UP) {
				// Select upper item in URL panel
				var url = UrlPanel.selectUpperItem(window);
				// Update URL in urlbar						// TODO Should be optional
				Urlbar.setUrl(window, url);
				sendLog('action: up');
			} else
			// Select previous element in listbox
			if (event.keyCode == event.DOM_VK_DOWN) {
				// Select down item in URL panel
				var url = UrlPanel.selectDownItem(window);
				// Update URL in urlbar					// TODO Should be optional
				Urlbar.setUrl(window, url);
				sendLog('action: down');
			}
		},

		/**
		 * Hide paths.
		 * @param	event		Event.
		 */
		onKeyUp: function(event) {
			// Check the keyboard control mode
			if (SimplePrefs.prefs.controlMode == 1) {
				return;
			}
			// Get active window
			var window = Tabs.activeTab.window;
			// Check if URL panel is opened
			var urlPanelOpened = UrlPanel.isOpened(window);
			// Open the panel
			if (event.keyCode == event.DOM_VK_ALT && !urlPanelOpened) {
				// Prevent panel opening if key up event were for another key binding
				if (this.preventUrlPanelShowing) {
					// Ask to stop to prevent URL panel showing
					this.preventUrlPanelShowing = false;
					return;
				}
				// Stop event propagation
				event.stopPropagation();
				// Cancel event to prevent menu to be displayed
				event.preventDefault();
				// Display URL panel
				UrlPanel.open(window);
			} else
			// Close the panel
			if (event.keyCode == event.DOM_VK_ALT && urlPanelOpened) {
				// Stop event propagation
				event.stopPropagation();
				// Cancel event to prevent menu to be displayed
				event.preventDefault();
				// Get current tab
				var currentTab = Tabs.activeTab;
				// Get selected item
				var url = UrlPanel.getSelectedItem(window);
				// Get selected item index
				var index = UrlPanel.getSelectedIndex(window);
				if (url && index >= 0 && index < currentTab.SUFPaths.length) {
					// Update SUF pointer
					currentTab.SUFPointer = index;
					// Load URL
					fr.hardcoding.scrollupfolder.loadUrl(url, event);
				}
				// Close URL panel
				UrlPanel.close(window);
			} else
			// Record a keybinding (starting with alt key but not for SUF)
			if (event.altKey) {
				// Ask to prevent URL panel showing
				this.preventUrlPanelShowing = true;
			}
		}
	},

	/**
	 * Behavior of URL panel.
	 */
	urlpanel: {
		/**
		 * Initialize URL panel event handlers.
		 */
		init: function() {
			// Add popup showing event handling
			UrlPanel.on('popupshowing', fr.hardcoding.scrollupfolder.urlpanel.onShowing);
			// Add popup shown event handling
			UrlPanel.on('popupshown', fr.hardcoding.scrollupfolder.urlpanel.onShown);
			// Add popup hidden event handling
			UrlPanel.on('popuphidden', fr.hardcoding.scrollupfolder.urlpanel.onHidden);
			// Add popup click event handling
			UrlPanel.on('click', fr.hardcoding.scrollupfolder.urlpanel.onClick);
			// Add popup hidden event handling
			UrlPanel.on('dblclick', fr.hardcoding.scrollupfolder.urlpanel.onDblClick);
			// Ensure the URL panel is closed when active tab changed
			Tabs.on('activate', fr.hardcoding.scrollupfolder.urlpanel.ensureClose);
			// Declare ensure panel closed method
			var ensurePanelClosed = function(tab) {
				// Close the panel
				UrlPanel.close(tab.window);
			};
			// Declare attach handler method
			var attachHandlers = function(tab) {
				// Ensure the URL panel is closed when tab is ready or page shown
				tab.on('ready', fr.hardcoding.scrollupfolder.urlpanel.ensureClose);
				tab.on('pageshow', fr.hardcoding.scrollupfolder.urlpanel.ensureClose);
			};
			// Attach handlers for all current tabs
			for (let tab of Tabs) {
				attachHandlers(tab);
			}
			// Add event handler on new tab to attach handlers
			Tabs.on('open', attachHandlers);
		},

		/**
		 * Ensure the URL panel is closed.
		 * @param	tab			The tab that request the panel to be closed.
		 */
		ensureClose: function(tab) {
			// Close the panel
			UrlPanel.close(tab.window);
		},

		/**
		 * Add paths to listbox.
		 * @param	event		The event.
		 */
		onShowing: function(event) {
			// Get listbox element
			var listbox = event.listbox;
			// Get current tab
			var currentTab = Tabs.activeTab;
			// Declare current pointer
			var pointer;
			// Check if paths should be updated
			if (typeof(currentTab.SUFPaths) === 'undefined' || (pointer = currentTab.SUFPaths.indexOf(currentTab.url)) === -1) {
				// Compute paths
				fr.hardcoding.scrollupfolder.processPaths(currentTab);
			} else {
				// Update pointer
				currentTab.SUFPointer = pointer;
			}
			// Prevent panel showing if these is no path
			if (currentTab.SUFPaths.length === 0) {
				// Cancel event to prevent popup to be displayed
				event.preventDefault();
				return;
			}
			// Create list items
			var index, listitem;
			for (index in currentTab.SUFPaths) {
				listitem = listbox.appendItem(currentTab.SUFPaths[index]);
			}
			// Fix listbox size
			var rows = listbox.getRowCount();
			if (rows !== 0) {
				listbox.setAttribute('rows', rows);
			}
		},

		/**
		 * Panel is shown.
		 * @param	event		The event.
		 */
		onShown: function(event) {
			// Get current tab
			var currentTab = Tabs.activeTab;
			// Select current URL
			UrlPanel.setSelectedIndex(currentTab.window, currentTab.SUFPointer);
			// Start input in urlbar
			Urlbar.startInput(currentTab.window);
			// Mark URL button as opened
			UrlButton.markOpened(currentTab.window);
		},

		/**
		 * Remove rows from panel.
		 * @param	event		The event.
		 */
		onHidden: function(event) {
			// Get listbox element
			var listbox = event.listbox;
			// Remove items
			while(listbox.getRowCount() > 0) {
				listbox.removeItemAt(0);
			}
			// Mark URL button as closed
			UrlButton.markClosed(Tabs.activeTab.window);
		},

		/**
		 * Display the selected row in urlbar.
		 * @param	event		The event.
		 */
		onClick: function(event) {
			// Get listbox element
			var listbox = event.listbox;
			// Get selected item
			var item = listbox.getSelectedItem(0);
			// Check selected item
			if (item == null)
				return;
			// Get current tab
			var currentTab = Tabs.activeTab;
			// Check the mouse control mode
			if (SimplePrefs.prefs.controlMode == 1) {
				// Update SUF pointer
				currentTab.SUFPointer = listbox.getIndexOfItem(item);
				// Load URL
				fr.hardcoding.scrollupfolder.loadUrl(item.label, event);
			} else {
				// Update urlbar location
				Urlbar.setUrl(currentTab.window, item.label, true);
			}
		},

		/**
		 * Load the selected row in urlbar.
		 * @param	event		The event.
		 */
		onDblClick: function(event) {
			// Get listbox element
			var listbox = event.listbox;
			// Get selected item
			var item = listbox.getSelectedItem(0);
			// Check selected item
			if (item == null)
				return;
			// Get current tab
			var currentTab = Tabs.activeTab;
			// Update SUF pointer
			currentTab.SUFPointer = listbox.getIndexOfItem(item);
			// Load URL
			fr.hardcoding.scrollupfolder.loadUrl(item.label, event);
		}


	// panel xul reference	https://developer.mozilla.org/en/XUL/panel
	// panel menu guide		https://developer.mozilla.org/en/XUL/PopupGuide/Panels
	// key codes			https://developer.mozilla.org/en/DOM/Event/UIEvent/KeyEvent
	// DOM & xul			https://developer.mozilla.org/en/Dynamically_modifying_XUL-based_user_interface

	// Code review : populate list on popupshowing event : https://developer.mozilla.org/en/XUL/panel#a-onpopupshowing
	// 				go to url on popuphiddin
	//				clear listbox on popuphidden event
	},

	/**
	 * Behavior of urlbar button.
	 */
	button: {
		/**
		 * Initialize urlbar button event hander.
		 */
		init: function() {
			// Add clicking event handling
			UrlButton.on('click', fr.hardcoding.scrollupfolder.button.onClick);
		},

		/**
		 * Open the URL panel and manage focus.
		 * @param	event		Event.
		 */
		onClick: function(event) {
			// Check the event button
			if (event.button != 0)
				return;
			// Open URL panel
			UrlPanel.open(Tabs.activeTab.window);
		}
	},

	/**
	 * Load an URL.
	 * @param	url			The URL to load.
	 * @param	event		The triggering event.
	 */
	loadUrl: function(url, event) {
		try {
			// Create valid URL from given URL
			var cleanedUrl = Url.URL(url);
			// Load valid URL
			fr.hardcoding.scrollupfolder.loadValidUrl(cleanedUrl.toString(), event);
		}
		// Catching if it is a badly formed URL
		catch(e) {
			sendLog('failed to load cleaned URL');
			switch (SimplePrefs.prefs.badUriAction) {
			case 2:
				// Force to load URL
				fr.hardcoding.scrollupfolder.loadValidUrl(url, event);
			break;
			case 1:
				// Get current tab
				var currentTab = Tabs.activeTab;
				// Replace with current URL
				Urlbar.setUrl(currentTab.window, currentTab.url);
			break;
			// Otherwise, do noting
			}
		}
	},

	/**
	 * Load a valid URL.
	 * @param	url			The URL to load.
	 * @param	event		The triggering event.
	 */
	loadValidUrl: function(url, event) {
		// Check shift modifier
		if (event && event.shiftKey) {
			// Load URL in a new browser
			Tabs.open({
				url: url,
				inNewWindow: true
			});
		}
		// Check control modifier
		else if (event && event.ctrlKey) {
			// Load URL in a new tab
			Tabs.open(url);
		}
		// Otherwise, load URL in current tab
		else {
			Tabs.activeTab.url = url;
		}
	},

	/**
	 * Generate paths for a tab.
	 * @param	tab		The tab to generate paths.
	 */
	processPaths: function(tab) {
		sendLog("focus");
		// Get current URL (not from urlbar, but loaded URL from current tab)
		var path = tab.url;
		// Check if paths are already generated
		if (tab.SUFPaths) {
			// Check if they tally with current URL
			var index = tab.SUFPaths.indexOf(path);
			if (index != -1) {
				// Update pointer position
				tab.SUFPointer = index;
				// End path computation
				return;
			}
		}
		// Initialize paths
		var paths = new Array();
		// Prevent path computation on about page
		if (path.substr(0, 6) != 'about:') {
			// Create paths
			while(path != null)	{
				paths.push(path);
				path = fr.hardcoding.scrollupfolder.canGoUp(path);
			}
		}
		// Set path to current tab
		tab.SUFPaths = paths;
		// Set pointer position
		tab.SUFPointer = 0;
	},

	/**
	 * Compute upper URL from a base URL.
	 * @param	baseUrl					The base URL for computation.
	 * @return							The upper URL from base URL.
	 */
	canGoUp : function(baseUrl) {
		/*-- Block could be down in the upper domain computation ? --*/
		// Valid baseUrl making an URL
		var url = null;
		try {
			url = Url.URL(baseUrl);
		}
		catch(ex) {
			return null;
		}
		/*-- end of block --*/
		var resolvedUrl = null;
		var indexAnchor = baseUrl.indexOf('#');
		// Try to escape anchor
		if (indexAnchor != -1 && SimplePrefs.prefs.parseAnchor) {
			return baseUrl.substring(0, indexAnchor);
		}
		var indexGetParam = baseUrl.indexOf('?');
		// Try to escape GET variables
		if (indexGetParam != -1 && SimplePrefs.prefs.parseGetVars) {
			// TODO Improvement for GET variables
//			alert("escape GET");
			return baseUrl.substring(0, indexGetParam);
		} else
		// Try to go one directory up
		if (baseUrl.charAt(baseUrl.length-1) == '/') {
			resolvedUrl = Url.URL('..', baseUrl).toString();
			// Check the URI resolution
			if (baseUrl != resolvedUrl && resolvedUrl.substr(resolvedUrl.length-2, 2) != '..') {
//				alert("directory up:\n"+baseUrl+" "+resolvedUrl);
				return resolvedUrl;
			}
		} else
		// Try to resolve current place
		{
			resolvedUrl = Url.URL('.', baseUrl).toString();
			if (resolvedUrl != baseUrl) {
//				alert("resolveUrl:\n"+baseUrl+" "+resolvedUrl);
				return resolvedUrl;
			}
		}
//		alert("Resolved: "+resolvedUrl+"\nBase: "+baseUrl);
//		if (resolvedUrl != baseUrl && resolvedUrl.substr(resolvedUrl.length-2, 2) != '..') {
//			returnUrl = resolvedUrl;
//		} else
		// Try to go one domain up
		// Get domain URI
		var domain = url.host;
		// TODO Really usefull ?
//			if (domain == null) {
//				return null;
//			}
		// Check if domain is IPv4 URL
		if (domain.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/)) {
			return null;
		}
		// Get URL scheme
		var scheme = url.scheme;
		/* lets see if can go up domain */
		/* delete first . of domain */
		var newDomain = domain.replace(/.*?\./,'');
		// var currentURI = getBrowser().selectedBrowser.currentURI;
		// sendLog({'old': content.document.domain, 'new': currentURI.host});
		// Check upper domain calculated
		if (newDomain == null || newDomain == domain || newDomain.indexOf('.') == -1) {
			return null;
		}
		/* if one period add www */
		var matches = newDomain.match(/\./g);
		if(matches != null && matches.length <= 1) {
			resolvedUrl = scheme+'://www.'+newDomain+'/';
		} else {
			resolvedUrl = scheme+'://'+newDomain+'/';
		}
		if (resolvedUrl == baseUrl) {
			return null;
		}
		return resolvedUrl;
	}
};

//Send debug message to console (debug only)
function sendLog(msg) {
	if (msg == null) {
		msg = "[null value]";
	} else if (typeof msg == 'object') {
		var newMsg = '';
		for(item in msg) {
			newMsg+= "'"+item+"' => '"+msg[item]+"', \n";
		}
		msg = newMsg.substring(0, newMsg.length-3);
	}
	console.log(msg);
};

// Load extension
fr.hardcoding.scrollupfolder.onLoad();