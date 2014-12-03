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
        addFolderToTree(client, tree, "");
    });
}

var addFolderToTree = function (client, tree, folder) {
    // TODO add folder to tree

    client.readdir(folder, undefined, function (apierror, names, folder, entries) {
        entries.forEach(function () {
            if(this.isFile){
                // TODO add file to tree
            }else{
                readFolder(client, tree, this);
            }
        })
    });
}