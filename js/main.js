/**
 * Created by Johannes on 02.12.2014.
 */


var client = new Dropbox.Client({ key: "f629oxf1xdmgu0g" });

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

        var tree = new Tree("main");

        addFolderToTree(client, tree, "", 0, function(){
            loadChart(tree)
        });
    });
}

var addFolderToTree = function (client, tree, folder, level, done) {
    if (level > 2) {
        done();
        return;
    }

    var open = 0;
    var subRequestDone = function(){
        if(--open == 0) {
            done();
        }
    };
    client.readdir(folder, function (showError, names, folder, entries) {
        var subtree = tree.addNode(folder.name);

        entries.forEach(function (entry) {
            if (entry.isFile) {
                console.log(entry.name, entry.size);
                subtree.addChild(entry.name, entry.size);
            } else {
                open++;
                addFolderToTree(client, subtree, entry.path, level + 1, subRequestDone);
            }
        });

        open == 0 && done();

    });
};


function loadChart(tree) {
    initializeChart(tree.toArray());
    console.log(tree.toArray())
}