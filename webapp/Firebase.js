sap.ui.define([
    "sap/ui/model/json/JSONModel"
], function (JSONModel) {
    "use strict";

    // var dataModel = this.getView().getModel("devData");

    // Firebase-config retrieved from the Firebase-console
    const firebaseConfig = {
        apiKey: "AIzaSyA8mpwUCJBfDtTsCx0oLAjcZwaigmx8En4",
        authDomain: "formularlyerje.firebaseapp.com",
        projectId: "formularlyerje",
        storageBucket: "formularlyerje.appspot.com",
        messagingSenderId: "906753102922",
        appId: "1:906753102922:web:ab0dfbbdc6c1ee368682b3",
        measurementId: "G-PN3FRHZC6W"
    };

    return {
        initializeFirebase: function () {
            // Initialize Firebase with the Firebase-config
            firebase.initializeApp(firebaseConfig);

            // Create a Firestore reference
            const firestore = firebase.firestore();

            // Firebase services object
            const oFirebase = {
                firestore: firestore
            };

            // Create a Firebase model out of the oFirebase service object which contains all required Firebase services
            var fbModel = new JSONModel(oFirebase);

            // Return the Firebase Model
            return fbModel;
        }
    };
});