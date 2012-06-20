/**
 * Code Editor for the Cloud9 IDE
 *
 * @copyright 2010, Ajax.org B.V.
 * @license GPLv3 <http://www.gnu.org/licenses/gpl.txt>
 */

define(function(require, exports, module) {

var ide = require("core/ide");
var ext = require("core/ext");
var menus = require("ext/menus/menus");
var util = require("core/util");
var settings = require("core/settings");
var commands = require("ext/commands/commands");
var anims = require("ext/anims/anims");

module.exports = ext.register("ext/editors/editors", {
    name    : "Editors",
    dev     : "Ajax.org",
    alone   : true,
    type    : ext.GENERAL,
    nodes   : [],

    fileExtensions  : {},

    showTabs : true,

    register : function(oExtension){
        /*var id = "rb" + oExtension.path.replace(/\//g, "_");

        oExtension.$rbEditor = barButtons.appendChild(new apf.radiobutton({
            id        : id,
            label     : oExtension.name,
            value     : oExtension.path,
            margin    : "0 -1 0 0",
            visible   : "{require('ext/editors/editors').isEditorAvailable(tabEditors.activepage, '" + oExtension.path + "')}",
            onclick   : function(){
                require('ext/editors/editors').switchEditor(this.value);
            }
        }));*/

        var _self = this;

        //Add a menu item to the list of editors
        oExtension.$itmEditor = menus.addItemByPath("View/Editors/" + oExtension.name, new apf.item({
            type     : "radio",
            value    : oExtension.path,
            group    : this.$itmGroup,
            onclick  : function(){
                _self.switchEditor(this.value);
            }
        }), 40000);

        var _self = this;
        oExtension.fileExtensions.each(function(mime){
            (_self.fileExtensions[mime] || (_self.fileExtensions[mime] = [])).push(oExtension);
        });

        if (!this.fileExtensions["default"] || (oExtension.name && oExtension.name == "Code Editor"))
            this.fileExtensions["default"] = oExtension;
    },

    unregister : function(oExtension){
        //oExtension.$rbEditor.destroy(true, true);
        oExtension.$itmEditor.destroy(true, true);

        var _self = this;
        oExtension.fileExtensions.each(function(fe){
            _self.fileExtensions[fe].remove(oExtension);
            if (!_self.fileExtensions[fe].length)
                delete _self.fileExtensions[fe];
        });

        menus.remove("View/Editors/" + oExtension.name);

        if (this.fileExtensions["default"] == oExtension) {
            delete this.fileExtensions["default"];

            for (var prop in this.fileExtensions) {
                this.fileExtensions["default"] = this.fileExtensions[prop][0];
                break;
            }
        }
    },

    toggleTabs : function(force, preview, noAnim, mouse){
        if (!force || force > 0) {
            if (!preview) {
                settings.model.setQueryValue("auto/tabs/@show", "true");
                ide.dispatchEvent("tabs.visible", {value: true});
                this.showTabs = true;
            }

            this.setTabResizeValues(tabEditors.parentNode.$ext, force == 1, !noAnim, mouse, 1);
        }
        else {
            if (!preview) {
                settings.model.setQueryValue("auto/tabs/@show", "false");
                ide.dispatchEvent("tabs.visible", {value: false});
                this.showTabs = false;
            }

            this.setTabResizeValues(tabEditors.parentNode.$ext, force == 1, !noAnim, mouse, 0);
        }

    },

    addTabSection : function(){
        var _self = this;

        var btn, btnMenu;
        var tab = new apf.bar({
            skin     : "basic",
            "class"  : "codeditorHolder",
            style    : "position:absolute;", 
            childNodes: [
                new apf.tab({
                    id      : "tabEditors",
                    skin    : "editor_tab",
                    style   : "height : 100%",
                    buttons : "close,scale,order",
                    animate : "[{require('core/settings').model}::general/@animateui]",
                    anims   : "{apf.isTrue(this.animate) ? 'add|remove|sync' : ''}",
                    overactivetab  : true,
                    onfocus        : function(e){
                        _self.switchfocus(e);
                    },
                    onbeforeswitch : function(e){
                        _self.beforeswitch(e);
                    },
                    onafterswitch : function(e){
                        _self.afterswitch(e);
                    },
                    onclose : function(e){
                        if (!ide.onLine && !ide.offlineFileSystemSupport) //For now prevent tabs from being closed
                            return false;

                        if (this.length == 1) {
                            btn.$ext.style.position = "absolute";
                            btn.$ext.style.right = "5px";
                            btn.$ext.style.top = "6px";
                            btn.$ext.parentNode.style.overflow = "hidden";
                        }

                        e.page.addEventListener("afterclose", _self.$close);
                    },
                    childNodes : [
                        btn = new apf.button({
                            id : "plus_tab_button",
                            "class" : "plus_tab_button",
                            skin : "btn_icon_only",
                            style : "position:absolute;right:5px;top:6px",
                            onclick : function(){
                                require("ext/newresource/newresource").newfile();
                            }
                        })
                    ]
                }),

                btnMenu = new apf.button({
                    onmouseover : function(){
                        this.setAttribute("submenu", require('ext/menus/menus').getMenuId('View/Tabs'));
                    },
                    onmousedown : function(){
                        apf.setStyleClass(window[menus.getMenuId('View/Tabs')].$ext, 'tabsContextMenu');
                    },
                    skin : "btn_icon_only",
                    "class" : "tabmenubtn",
                }) /*,
                new apf.hbox({
                    id      : "barButtons",
                    edge    : "0 0 0 6",
                    "class" : "relative",
                    zindex  : "1000",
                    bottom  : "0",
                    left    : "0",
                    right   : "0"
                })*/
            ]
        });

        colMiddle.appendChild(tab);
        var tabs = tabEditors;

        this.buttons = {
            add: btn,
            menu: btnMenu
        }

        tabs.$buttons.appendChild(btn.$ext);
        tabs.$buttons.appendChild(btnMenu.$ext);
        tabs.addEventListener("DOMNodeInserted",function(e){
            if (e.$isMoveWithinParent) {
                //record position in settings

                var amlNode = e.currentTarget;
                if (amlNode.localName != "page" || e.relatedNode != this || amlNode.nodeType != 1)
                    return;

                settings.save();
            }

            if (e.relatedNode == this && e.currentTarget.localName == "page") {
                tabs.$buttons.appendChild(btn.$ext);
                if (btn.$ext.style.position) {
                    //tabs.appendChild(btn);
                btn.$ext.style.position = "";
                btn.$ext.style.right = "";
                btn.$ext.style.top = "";
            }
            }
        });

        barButtonContainer.$int.appendChild(tabEditors.$buttons);
        barButtonContainer.$int.style.paddingRight
            = (parseInt(apf.getStyle(tabEditors.$buttons, "paddingLeft"))
            + parseInt(apf.getStyle(tabEditors.$buttons, "paddingRight"))) + "px";

        if (!apf.isGecko) {
            tabEditors.$buttons.style.position = "absolute";
            tabEditors.$buttons.style.left = "0";
            tabEditors.$buttons.style.top = "0";
            tabEditors.$buttons.style.right = "0";
            tabEditors.$buttons.style.bottom = "0";
        }
    },

    /**
     * This method has been abstracted so it can be used by
     * the zen extension to get the destination coordinates and
     * dimensions of tabEditors.parentNode when the editor goes
     * out of zen mode
     */
    setTabResizeValues : function(ext, preview, animate, mouse, dir) {
        var ph;
        var _self = this;

        if (this.animating && (!animate || this.animating[0] == preview))
            return;

        if (animate) {
            if (this.animateControl)
                this.animateControl.stop();

            this.animating = [preview];

            if (dir == undefined)
                dir = tabEditors.$buttons.style.height == "10px" ? 1 : 0;
            var duration = mouse ? 0.2 : 0.2;

            if (!apf.isGecko)
                tabEditors.$buttons.style.overflow = "hidden";

            if (dir) {
                apf.setStyleClass(tabEditors.$buttons.parentNode, "", ["hidetabs"]);
                apf.setStyleClass(tabEditors.$buttons.parentNode, "step5");
            }
            else {
                //@todo this is a bit hacky
                ide.dispatchEvent("animate", {
                    type: "editor",
                    delta: 16
                });
            }

            var i = dir ? 6 : 0, j = 0;
            [1,2,3,4,5,6].forEach(function(x){
                setTimeout(function(){
                    if (x == 6) {
                        if (!dir)
                            apf.setStyleClass(tabEditors.$buttons.parentNode, "hidetabs");
                        
                        return;
                    }
                    
                    apf.setStyleClass(tabEditors.$buttons.parentNode,
                        "step" + (dir ? --i : ++i),
                        ["step" + (dir ? i + 1 : i-1)]);

                }, ++j * (duration / 6) * 1000);
            });
            
            anims.animateMultiple([
                { duration : duration, node: ext, top : (this.showTabs || preview ? 0 : -16) + "px"},
                //{ duration : duration, node: ext, height : ((this.showTabs || preview ? 0 : 16) + ph.offsetHeight - d[1]) + "px"},
                { duration : duration, node: tabEditors.$buttons, height: (this.showTabs || preview ? 22 : 7) + "px"},
                { duration : duration, node: this.buttons.add, opacity : dir ? 1 : 0},
                { duration : duration, node: this.buttons.add, height : (dir ? 17 : 10) + "px"},
                { duration : duration, node: this.buttons.menu, opacity : dir ? 1 : 0},
                { duration : duration, node: this.buttons.menu, height : (dir ? 17 : 10) + "px"}
            ], function(e){
                apf.setStyleClass(tabEditors.$buttons.parentNode, "", ["step" + i]);
                    _self.animating = false;
                
                tabEditors.parentNode.setAttribute("margin", 
                    (this.showTabs || preview ? "0 0 0 0" : "-16 0 0 0"));

                if (!apf.isGecko)
                    tabEditors.$buttons.style.overflow = "";
            });
        }
        else {
            if (this.showTabs || preview) {
                tabEditors.$buttons.style.height = "22px";
                apf.setStyleClass(tabEditors.$buttons.parentNode, "", ["hidetabs"]);
                this.buttons.menu.setHeight(17);
                this.buttons.add.setHeight(17);
            }
            else {
                tabEditors.$buttons.style.height = "7px";
                apf.setStyleClass(tabEditors.$buttons.parentNode, "hidetabs");
                this.buttons.menu.setHeight(10);
                this.buttons.add.setHeight(10);
            }
        }
    },

    isEditorAvailable : function(page, path){
        var editor = ext.extLut[path];
        if (!editor)
            return false;

        var fileExtensions = editor.fileExtensions;
        var fileExtension = (tabEditors.getPage(page).$model.queryValue("@path") || "").split(".").pop().toLowerCase();
        var isEnabled = fileExtensions.indexOf(fileExtension) > -1;

        if (!isEnabled && this.fileExtensions["default"] == editor)
            return true;
        else
            return isEnabled;
    },

    initEditor : function(editor){
        //Create Page Element
        var editorPage = new apf.page({
            id        : editor.path,
            mimeTypes : editor.fileExtensions,
            visible   : false,
            realtime  : false
        });
        tabEditors.appendChild(editorPage);

        //Initialize Content of the page
        ext.initExtension(editor, editorPage);

        return editorPage;
    },

    switchEditor : function(path){
        var page = tabEditors.getPage();
        if (!page || page.type == path)
            return;

        var lastType = page.type;

        var info;
        if ((info = page.$doc.dispatchEvent("validate", info)) === true) {
            util.alert(
                "Could not switch editor",
                "Could not switch editor because this document is invalid.",
                "Please fix the error and try again:" + info
            );
            return;
        }

        var editor = ext.extLut[path];
        if (!editor.inited)
            this.initEditor(editor);

        //editor.$rbEditor.select();

        page.setAttribute("type", path);

        page.$editor = editor;
        this.currentEditor = editor;

        this.beforeswitch({nextPage: page});
        this.afterswitch({nextPage: page, previousPage: {type: lastType}, keepEditor : true});
    },

    openEditor : function(doc, init, active, forceOpen) {
        var xmlNode  = doc.getNode();
        var filepath = xmlNode.getAttribute("path");
        var tabs = tabEditors;

        if (!forceOpen) {
            var page = tabs.getPage(filepath);
            if (page) {
                tabs.set(page);
                return;
            }
        }

        var fileExtension = (xmlNode.getAttribute("path") || "").split(".").pop().toLowerCase();
        var editor = this.fileExtensions[fileExtension]
          && this.fileExtensions[fileExtension][0]
          || this.fileExtensions["default"];

        if (!init && this.currentEditor)
            this.currentEditor.disable();

        if (!editor) {
            util.alert(
                "No editor is registered",
                "Could not find an editor to display content",
                "There is something wrong with the configuration of your IDE. No editor plugin is found.");
            return;
        }

        if (!editor.inited)
            this.initEditor(editor);

        //Create Fake Page
        if (init)
            tabs.setAttribute("buttons", "close");

        if (!apf.isGecko)
            tabEditors.$buttons.style.overflow = "";

        var model = new apf.model();
        var fake = tabs.add("{([@changed] == 1 ? '*' : '') + [@name]}", filepath, editor.path, null, function(page){
            page.$at     = new apf.actiontracker();
            page.$doc    = doc;
            doc.$page    = page;
            page.$editor = editor;
            page.setAttribute("autofocus", false);
            page.setAttribute("tooltip", "[@path]");
            page.setAttribute("class",
                "{parseInt([@saving], 10) || parseInt([@lookup], 10) ? (tabEditors.getPage(tabEditors.activepage) == this ? 'saving_active' : 'saving') : \
                ([@loading] ? (tabEditors.getPage(tabEditors.activepage) == this ? 'loading_active' : 'loading') : '')}"
            );
            page.setAttribute("model", page.$model = model);

            model.load(xmlNode);
            model.addEventListener("update", function(){
                settings.save();
            });
        });

        if (init)
            tabs.setAttribute("buttons", "close,scale,order");

        doc.addEventListener("setnode", function(e) {
            fake.$model.load(e.node);
        });

        this.initEditorEvents(fake, model);

        ide.dispatchEvent("tab.create", {
            page: fake,
            model: model,
            doc: doc
        });

        if (active === false) // init && !
            return;

        //Set active page
        tabs.set(filepath);

        editor.enable();
        //editor.$rbEditor.select();

        this.currentEditor = editor;

        // okay don't know if you would want this, but this is the way the 'open file' dialog
        // handles it so let's do that
        setTimeout(function () {
            if (typeof editor.amlEditor !== "undefined") {
                editor.amlEditor.focus();
                ide.dispatchEvent("aftereditorfocus");
            }
        }, 100);

        settings.save();
    },

    initEditorEvents: function(page, model) {
        model = model || page.$model;
        page.$at.addEventListener("afterchange", function(e) {
            if (e.action == "reset") {
                delete this.undo_ptr;
                return;
            }

            var val;
            if (page.$at.ignoreChange) {
                val = undefined;
                page.$at.ignoreChange = false;
            }
            else if(this.undolength === 0 && !this.undo_ptr) {
                val = undefined;
            }
            else {
                val = (this.$undostack[this.$undostack.length - 1] !== this.undo_ptr)
                    ? 1
                    : undefined;
            }

            if (page.changed !== val) {
                page.changed = val;
                model.setQueryValue("@changed", (val ? "1" : "0"));

                var node = page.$model.data;
                ide.dispatchEvent("updatefile", {
                    changed : val ? 1 : 0,
                    xmlNode : node
                });
            }
        });
    },

    resizeTabs : function(cancel){
        clearTimeout(this.closeTimer);

        if (cancel)
            return;

        this.closeTimer = setTimeout(function(){
            tabEditors.$waitForMouseOut = false;
            tabEditors.$scaleinit(null, "sync");
        }, 500);
    },

    close : function(page) {
        var pages = tabEditors.getPages();
        var isLast = (pages[pages.length - 1] == page);
        tabEditors.remove(page);
        this.resizeTabs(isLast);
    },

    $close : function() {
        var page   = this;
        var at     = page.$at;
        var editor = page.$editor;
        var mdl    = page.$model;

        mdl.setQueryValue("@changed", 0);
        page.$doc.dispatchEvent("close");

        if (mdl.data) {
            mdl.removeXml("data");
            ide.dispatchEvent("closefile", {xmlNode: mdl.data, page: page});
        }

        //mdl.unshare();
        mdl.destroy();

        at.reset();
        at.destroy();

        //If there are no more pages left, reset location
        if (tabEditors.getPages().length == 1) {
            /*if (window.history.pushState) {
                var p = location.pathname.split("/");
                window.history.pushState(path, path, "/" + (p[1] || "") + "/" + (p[2] || ""));
            }
            else {
                apf.history.setHash("");
            }*/
            //apf.history.setHash("");

            editor.clear && editor.clear();
            require("ext/editors/editors").currentEditor = null;
        }

        //Destroy the app page if it has no application instance
        //if (!tabEditors.selectNodes("page[@type='" + page.type + "']").length && editorPage)
            //editorPage.destroy(true, true);

        settings.save();
    },

    switchfocus : function(e){

    },

    beforeswitch : function(e) {
        var page       = e.nextPage;
        var editorPage = tabEditors.getPage(page.type);
        
        if (!editorPage) return;

        // fire this event BEFORE editor sessions are swapped.
        if (ide.dispatchEvent("tab.beforeswitch", {
            previousPage: e.previousPage,
            nextPage: e.nextPage
        }) === false)
            return false;

        if (editorPage.model != page.$model)
            editorPage.setAttribute("model", page.$model);
        if (editorPage.actiontracker != page.$at)
            editorPage.setAttribute("actiontracker", page.$at);

            page.$editor.setDocument && page.$editor.setDocument(page.$doc, page.$at);
    },

    afterswitch : function(e) {
        var _self = this;
        var page = e.nextPage;
        
        if (this.switchLoop == page.id)
            return;
        
        var fromHandler, toHandler = ext.extLut[page.type];

        if (e.previousPage && e.previousPage != e.nextPage)
            fromHandler = ext.extLut[e.previousPage.type];

        if (fromHandler != toHandler) {
            if (fromHandler)
                fromHandler.disable();
            toHandler.enable();
        }

        var path = page.$model.data.getAttribute("path").replace(/^\/workspace/, "");
        /*if (window.history.pushState) {
            var p = location.pathname.split("/");
            window.history.pushState(path, path, "/" + (p[1] || "name") + "/" + (p[2] || "project") + path);
        }
        else {
            apf.history.setHash("!" + path);
        }*/
        apf.history.setHash("!" + path);

        settings.save();

        if (!e.keepEditor) {
            var fileExtension = (path || "").split(".").pop().toLowerCase();
            var editor = this.fileExtensions[fileExtension]
              && this.fileExtensions[fileExtension][0]
              || this.fileExtensions["default"];

            if (!editor) {
                util.alert(
                    "No editor is registered",
                    "Could not find an editor to display content",
                    "There is something wrong with the configuration of your IDE. No editor plugin is found.");
                return;
            }

            if (!editor.inited)
                this.initEditor(editor);

            this.currentEditor = editor;
        }
        else {
            var editor = page.$editor;
        }

        if (editor.focus)
            editor.focus();

        //toHandler.$rbEditor.select();

        /*if (self.TESTING) {}
            //do nothing
        else if (page.appid)
            app.navigateTo(page.appid + "/" + page.id);
        else if (!page.id)
            app.navigateTo(app.loc || (app.loc = "myhome"));*/

        clearTimeout(this.afterswitchTimeout);
        this.afterswitchTimeout = setTimeout(function(){
            _self.switchLoop = page.id;
            
            ide.dispatchEvent("tab.afterswitch", {
                previousPage: e.previousPage,
                nextPage: e.nextPage
            });
            
            delete _self.switchLoop;
        }, 150);
    },

    /**** Init ****/

    init : function(){
        var _self = this;

        window.onpopstate = function(e){
            var page = "/workspace" + e.state;
            if (tabEditors.activepage != page && tabEditors.getPage(page))
                tabEditors.set(page);
        };

        apf.addEventListener("hashchange", function(e){
            var page = "/workspace" + e.page;
            if (tabEditors.activepage != page && tabEditors.getPage(page))
                tabEditors.set(page);
        });

        menus.addItemByPath("View/Editors/", new apf.menu({
            "onprop.visible" : function(e){
                if (e.value) {
                    if (!_self.currentEditor)
                        this.disable();
                    else {
                        this.enable();

                        var nodes = this.childNodes;
                        for (var i = nodes.length - 1; i >= 0; i--) {
                            nodes[i].setAttribute("disabled",
                                !_self.isEditorAvailable(
                                    tabEditors.activepage, nodes[i].value));
                        }

                        _self.$itmGroup.setValue(_self.currentEditor.path);
                    }
                }
            }
        }), 190);

        commands.addCommand({
            name: "toggleTabs",
            bindKey : { mac : "Ctrl-M", win : "Ctrl-M" },
            exec: function(e){
                 _self.toggleTabs(!_self.showTabs ? 1 : -1);
            }
        });

        menus.addItemByPath("View/Tab Buttons", new apf.item({
            type: "check",
            checked : "[{require('core/settings').model}::auto/tabs/@show]",
            command : "toggleTabs"
        }), 300);

        ext.addType("Editor", function(oExtension){
            _self.register(oExtension);
          }, function(oExtension){
            _self.unregister(oExtension);
          });

        ide.addEventListener("openfile", function(e){
            _self.openEditor(e.doc, e.init, e.active, e.forceOpen);
        });

        ide.addEventListener("filenotfound", function(e) {
            var page = tabEditors.getPage(e.path);
            if (page)
                tabEditors.remove(page);
        });

        ide.addEventListener("afteroffline", function(e){
            tabEditors.$setStyleClass(tabEditors.$ext, "offline");
        });

        ide.addEventListener("afteronline", function(e){
            tabEditors.$setStyleClass(tabEditors.$ext, "", ["offline"]);
        });

        this.$itmGroup = new apf.group();

        this.nodes.push(this.addTabSection());

        ide.addEventListener("animate", function(e){
            if (self.logobar && e.which == logobar) {
                if (e.options.height == "12px") {
                    anims.animate(tabEditors.$buttons, {
                        paddingRight: "53px",
                        timingFunction: e.options.timingFunction,
                        duration: e.options.duration
                    }, function(){
                        apf.setStyleClass(tabEditors.$buttons, "morepadding");
                    });
                }
                else {
                    anims.animate(tabEditors.$buttons, {
                        paddingRight: "4px",
                        timingFunction: e.options.timingFunction,
                        duration: e.options.duration
                    }, function(){
                        apf.setStyleClass(tabEditors.$buttons, "", ["morepadding"]);
                    });
                }
            }
        });

        /**** Support for state preservation ****/

        this.$settings = {};
        ide.addEventListener("settings.load", function(e){
            settings.setDefaults("auto/files", [])
            settings.setDefaults("auto/tabs", [["show", "true"]]);

            _self.loadedSettings = false;

            if (apf.isTrue(e.model.queryValue("auto/menus/@minimized"))) {
                apf.setStyleClass(tabEditors.$buttons, "morepadding");
            }

            var showTab = settings.model.queryValue("auto/tabs/@show");
            _self.showTabs = apf.isTrue(showTab);
            if (!_self.showTabs)
                _self.toggleTabs(_self.showTabs ? 1 : -1, true, true);;

            function checkExpand(path, doc) {
                ide.addEventListener("init.ext/tree/tree", function(){
                    var parent_path = apf.getDirname(path).replace(/\/$/, "");
                    var expandEventListener = function(e) {
                        if (e.xmlNode && e.xmlNode.getAttribute("path") == parent_path) {
                            // if the file has been loaded from the tree
                            if (doc.getNode().getAttribute("newfile") != 1) {
                                // databind the node from the tree to the document
                                doc.setNode(e.xmlNode.selectSingleNode("node()[@path='" + path + "']"));
                            }
                            else {
                                // if not? then keep it this way, but invoke setNode() anyway because
                                // it triggers events
                                doc.setNode(doc.getNode());
                            }
                            trFiles.removeEventListener("expand", expandEventListener);
                        }
                    };

                    trFiles.addEventListener("expand", expandEventListener);
                });
            }

            var model = e.model;
            ide.addEventListener("extload", function(){
                // you can load a file from the hash tag, if that succeeded then return
                var loadFileFromHash =  (_self.loadFileFromHash(window.location.hash, checkExpand));
                if (loadFileFromHash) {
                    window.location.hash = loadFileFromHash; // update hash
                    return;
                }

                // otherwise, restore state from the .config file
                var active = model.queryValue("auto/files/@active");
                var nodes  = model.queryNodes("auto/files/file");

                for (var i = 0, l = nodes.length; i < l; i++) {
                    var node  = nodes[i];
                    var state = node.getAttribute("state");
                    var doc   = ide.createDocument(node);

                    try {
                        if (state)
                            doc.state = JSON.parse(state);
                    }
                    catch (ex) {}

                    // node.firstChild is not always present (why?)
                    if ((node.getAttribute("changed") == 1) && node.firstChild) {
                        doc.cachedValue = node.firstChild.nodeValue
                            .replace(/\n]\n]/g, "]]")
                            .replace(/\\r/g, "\r")
                            .replace(/\\n/g, "\n");
                    }

                    _self.gotoDocument({
                        doc      : doc,
                        init     : true,
                        forceOpen: true,
                        active   : active
                            ? active == node.getAttribute("path")
                            : i == l - 1
                    });

                    checkExpand(node.getAttribute("path"), doc);
                }

                _self.loadedSettings = true;
            });
        });

        ide.addEventListener("settings.save", function(e){
            if (!e.model.data || !_self.loadedSettings)
                return;

            var pNode   = e.model.data.selectSingleNode("auto/files");
            var pages   = tabEditors.getPages();

            if (pNode) {
                pNode.parentNode.removeChild(pNode);
                pNode = null;
            }

            if (pages.length) {
                var active = tabEditors.activepage;
                
                if (tabEditors.getPage(active).$model.data.getAttribute("ignore") !== "1")
                e.model.setQueryValue("auto/files/@active", active);

                pNode = apf.createNodeFromXpath(e.model.data, "auto/files");
                for (var i = 0, l = pages.length; i < l; i++) {
                    if (!pages[i] || !pages[i].$model || pages[i].$model.data.getAttribute("ignore") == "1")
                        continue;

                    var file = pages[i].$model.data;
                    if (!file || file.getAttribute("debug"))
                        continue;

                    var copy = apf.xmldb.cleanNode(file.cloneNode(false));
                    if (!copy.getAttribute("newfile"))
                        copy.removeAttribute("changed");
                    copy.removeAttribute("loading");
                    copy.removeAttribute("saving");
                    pNode.appendChild(copy);

                    var state = pages[i].$editor.getState && pages[i].$editor.getState(pages[i].$doc);
                    if (state)
                        copy.setAttribute("state", JSON.stringify(state));

                    //@todo the second part of this if can be removed as soon
                    //as the collab team implements stored changed settings
                    //please note that for this to work on loadsettings we
                    //should check whether the file on disk has changed and
                    //popup a file watch dialog to ask if the user wants to
                    //load the new file from disk, losing changes.
                    if (copy.getAttribute("changed") == 1 && copy.getAttribute("newfile") == 1) {
                        copy.appendChild(copy.ownerDocument.createCDATASection(
                            (pages[i].$doc.getValue() || "")
                                .replace(/\r/g, "\\r")
                                .replace(/\n/g, "\\n")
                                .replace(/\]\]/g, "\n]\n]")
                        ));
                    }
                }
            }
        });
    },

    /** Load any file from the hash, with optional some lines selected
     *
     * @param {string} hash Hash as obtained from the window element
     * @param {function} checkExpand Function that expands the tree for the given file
     * @return {string} The new hash
     */
    loadFileFromHash : function (hash, checkExpand) {
        // an initial state can be sent in the hash
        // match 'openfile-',
        // match any character except :& or end of file
        // optional: match : digit - digit
        // [1] is filename, [2] is starting line number, [3] is ending line number
        var editorInitialStatePattern = /openfile-(.[^:&$]*)(?:\:(\d+)-(\d+))?/;
        var rawState = hash.match(editorInitialStatePattern);

        if (rawState) {
            // build the real path, as the one in the hash is relative
            var path = ide.davPrefix.replace(/\/$/, "") + "/" + rawState[1];
            var doc = ide.createDocument(this.createFileNodeFromPath(path));

            // if selection information was added, add that to the state
            if (rawState[2] && rawState[3]) {
                doc.state = {
                    scrollleft: 0, scrolltop: 0,
                    selection: {
                        start: { row: parseInt(rawState[2] || 0, 10) - 1, column: 0 },
                        end: { row: parseInt(rawState[3] || 0, 10), column: 0 } // plus 1 to capture whole previous line
                    }
                };
            }

            // send it to the dispatcher
            editors.gotoDocument({
                node : node,
                active: true
            });
            
            // and expand the tree
            checkExpand(path, doc);

            // return the new hash
            return hash.replace(editorInitialStatePattern, "");
        }

        return null;
    },

    createFileNodeFromPath : function (path) {
        var name = path.split("/").pop();
        var node = apf.n("<file />")
            .attr("name", name)
            .attr("contenttype", util.getContentType(name))
            .attr("path", path)
            .node();
        return node;
    },

    createFolderNodeFromPath : function (path) {
        var name = path.split("/").pop();
        var node = apf.n("<folder />")
            .attr("name", name)
            .attr("contenttype", util.getContentType(name))
            .attr("path", path)
            .node();
        return node;
    },

    pauseTabResize : function(){
        tabEditors.setAttribute("buttons", "close,order");
    },

    continueTabResize : function(){
        setTimeout(function(){
            tabEditors.setAttribute("buttons", "close,scale,order");
            tabEditors.$waitForMouseOut = false;
            tabEditors.$scaleinit(null, "sync");
        }, 300);
    },

    gotoDocument : function(options) {
        if (!options.node && options.path)
            options.node = this.createFileNodeFromPath(options.path)

        this.jump(options);
    },

    jump : function(options) {
        var row     = options.row;
        var column  = options.column;
        var text    = options.text;
        var page    = options.page;
        
        var hasData;
        if (!options.doc) {
            var node    = options.node;
            var path    = node.getAttribute("path");
        var tabs    = tabEditors;
            
            hasData = page && (tabs.getPage(path) || { }).$doc ? true : false;
        }
        
        var _self   = this;

        if (row !== undefined) {
            var jumpTo = function(){
                var f;
                setTimeout(f = function() {
                    // TODO move this to the editor
                    var editor = _self.currentEditor.amlEditor;
                    editor.$editor.gotoLine(row, column, false);
                    if (text)
                        editor.$editor.find(text, null, false);

                    editor.focus();
                    ide.dispatchEvent("aftereditorfocus");
                }, 100);
            };

            if (hasData) {
                tabs.set(path);
                jumpTo();
            }
            else
                ide.addEventListener("afteropenfile", function(e) {
                    var node = e.doc.getNode();

                    if (node.getAttribute("path") == path) {
                        ide.removeEventListener("afteropenfile", arguments.callee);
                        jumpTo();
                    }
                });
        }

        if (!hasData) {
            if (!options.doc)
                options.doc = ide.createDocument(options.node);

            ide.dispatchEvent("openfile", options);
        }
        else
            tabs.set(path);
    },

    enable : function(){
//        this.hbox.show();
        //this.splitter.show();
    },

    disable : function(){
//        this.hbox.hide();
        //this.splitter.hide();
    },

    destroy : function(){
        menus.remove("View/Tab Bar");
        menus.remove("View/Editors/");

//        this.hbox.destroy(true, true);
        //this.splitter.destroy(true, true);
    }
});

});
