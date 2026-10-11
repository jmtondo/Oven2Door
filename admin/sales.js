/* =====================================================
   OVENTODoor SALES REPORT
   Database connection will be added later.
===================================================== */


/* =====================================================
   DAILY / WEEKLY / MONTHLY BUTTONS
===================================================== */

const periodButtons = document.querySelectorAll(".period-btn");


periodButtons.forEach(function(button) {

    button.addEventListener("click", function() {


        /* Remove active from all buttons */

        periodButtons.forEach(function(btn) {

            btn.classList.remove("active");

        });


        /* Add active to selected button */

        this.classList.add("active");


        /* Get selected period */

        const selectedPeriod = this.getAttribute("data-period");


        console.log("Selected sales period:", selectedPeriod);


        /*
            DATABASE CODE WILL GO HERE LATER.

            Example:

            daily
            weekly
            monthly
        */

    });

});



/* =====================================================
   SEARCH RECENT SALES
===================================================== */

const searchInput = document.getElementById("salesSearch");


if (searchInput) {


    searchInput.addEventListener("input", function() {


        const searchValue =
            this.value.toLowerCase();


        const rows =
            document.querySelectorAll("#salesTable tr");


        rows.forEach(function(row) {


            const rowText =
                row.textContent.toLowerCase();


            if (rowText.includes(searchValue)) {

                row.style.display = "";

            } else {

                row.style.display = "none";

            }

        });

    });

}



/* =====================================================
   EXPORT REPORT
===================================================== */

const exportButton =
    document.getElementById("exportProducts");


if (exportButton) {


    exportButton.addEventListener("click", function() {


        alert(
            "Sales data is not available yet. Please connect the database first."
        );


    });

}