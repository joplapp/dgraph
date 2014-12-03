/**
 * Created by Johannes on 02.12.2014.
 */


var client = new Dropbox.Client({ key: "f629oxf1xdmgu0g" });

var host = "siebenundvierzig.github.io";
if ((host == window.location.host) && (window.location.protocol != "https:")){
    window.location.protocol = "https";
}

$( document ).ready(function() {
    $('#dropbox-connect').click(function () {
        authenticate();
    });
});

function authenticate(){
    client.authenticate(function(error, client) {
        if (error) {
            // Replace with a call to your own error-handling code.
            //
            // Don't forget to return from the callback, so you don't execute the code
            // that assumes everything went well.
            return showError(error);
        }

        // Replace with a call to your own application code.
        //
        // The user authorized your app, and everything went well.
        // client is a Dropbox.Client instance that you can use to make API calls.
        $("#dropbox-connect").hide();
        $("#progress-box").show();
        var totalBytes = 0;

        client.getAccountInfo(function (error, accountInfo) {
            totalBytes = accountInfo.usedQuota;
            console.log(totalBytes);
        });

        var tree = new Tree("main");

        loadDelta(tree, undefined, function(){
            $("#progress-box").hide();
            $("#tipp").show();
            loadChart(tree);
            window.tree = tree;
        }, function (currentProgress) {
            console.log(currentProgress / totalBytes);
            if (totalBytes == 0) {
                return;
            }
            var progress = Math.round(currentProgress * 10000 / totalBytes) / 100;
            $('#progress-bar').text(progress+"%");
            $('#progress-bar').css("width",progress+"%");
        }, 0, 500000);
    });
}

var followPath = function(tree, path, method, attrib){
    var folders = path.split("/");
    var node = tree, newNode;

    for(var i=1; i<folders.length-1; i++){
        newNode = node.getNode(folders[i]);
        if (!newNode) {
            newNode = node.addNode(folders[i]);
        }
        node = newNode;
    }

    node[method](folders.pop(), attrib);
};

var addFolder = function(tree, path){
    // console.log(path+ " was added.");
    followPath(tree, path, "addNode");
};
var addFile = function(tree, path, size){
    // console.log(path+ " was added.");
    followPath(tree, path, "addChild", size);
};

var SMALL_FILE_THRESHOLD = 1000; //bytes
var loadDelta = function (tree, cursor, done, progress, currentBytes, counter) {
    progress(currentBytes);

    if(counter < 0){
        done();
        return;
    }
    client.delta(cursor, function(err, result){
        if(!result.changes){
            done();
            return;
        }

        result.changes.forEach(function(item){
            if(item.stat.isFolder) {
                addFolder(tree, item.path)
            } else {
                addFile(tree, item.path, item.stat.size);
                currentBytes += item.stat.size;
            }
        });
        if(result.shouldPullAgain) {
            loadDelta(tree, result.cursorTag, done, progress, currentBytes, counter - result.changes.length)
        } else {
            done();
        }
    })
};

var THRESHOLD = 20;
function cleanUpTree(node){
    console.log("before. children: ",node.children.length,", leaves: ",node.leaves.length);
    if(node.leaves.length > THRESHOLD){
        var size = node.getXLargestChildrenSize(THRESHOLD);
        console.log("size: ",size);
        node.combineLeaves(size);
    }
    console.log("after. children: ",node.children.length,", leaves: ",node.leaves.length);

    node.nodes.forEach(cleanUpTree);
}

function loadChart(tree) {
    cleanUpTree(tree);

    initializeChart(tree.toArray());
    console.log(tree.toArray());
}

function getReadableFileSizeString(fileSizeInBytes) {

    var i = -1;
    var byteUnits = [' kB', ' MB', ' GB', ' TB', 'PB', 'EB', 'ZB', 'YB'];
    do {
        fileSizeInBytes = fileSizeInBytes / 1024;
        i++;
    } while (fileSizeInBytes > 1024);

    return Math.max(fileSizeInBytes, 0.1).toFixed(1) + byteUnits[i];
};
