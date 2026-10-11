// ==========================================
// OVEN2DOOR - CUSTOMERS MODULE
// ==========================================


// Customer sample data
const customers = [
    {
        id: "182-3824",
        name: "Trixie Anne Sarmiento",
        email: "a***@gmail.com",
        contact: "09******675",
        status: "Completed",
        returning: true
    },
    {
        id: "182-2394",
        name: "Dianna Beltran",
        email: "r***@gmail.com",
        contact: "09******341",
        status: "Cancelled",
        returning: false
    },
    {
        id: "182-1214",
        name: "Shai",
        email: "l***@gmail.com",
        contact: "09******546",
        status: "Pending",
        returning: true
    },
    {
        id: "182-1218",
        name: "Em Tondo",
        email: "l***@gmail.com",
        contact: "09******546",
        status: "Pending",
        returning: true
    },
{
        id: "182-1220",
        name: "Joanna Samonte",
        email: "l***@gmail.com",
        contact: "09******546",
        status: "Pending",
        returning: true
    },
 
];




// ==========================================
// GET HTML ELEMENTS
// ==========================================


const tableBody = document.getElementById("customerTableBody");
const emptyState = document.getElementById("emptyState");


const searchInput = document.getElementById("customerSearch");
const statusFilter = document.getElementById("statusFilter");
const sortSelect = document.getElementById("sortCustomers");


const viewModal = document.getElementById("viewModal");
const addModal = document.getElementById("addModal");
const deleteModal = document.getElementById("deleteModal");


let customerToDelete = null;




// ==========================================
// GET CUSTOMER INITIALS
// ==========================================


function getInitials(name) {


    return name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map(word => word[0].toUpperCase())
        .join("");


}




// ==========================================
// DISPLAY CUSTOMERS
// ==========================================


function renderCustomers() {


    const search = searchInput.value.trim().toLowerCase();
    const status = statusFilter.value;
    const sort = sortSelect.value;


    // Filter customers
    let filtered = customers.filter(customer => {


        const matchesSearch =
            customer.name.toLowerCase().includes(search) ||
            customer.id.toLowerCase().includes(search) ||
            customer.email.toLowerCase().includes(search) ||
            customer.contact.toLowerCase().includes(search);


        const matchesStatus =
            status === "all" ||
            customer.status === status;


        return matchesSearch && matchesStatus;


    });




    // ======================================
    // SORT CUSTOMERS
    // ======================================


    if (sort === "nameAsc") {


        filtered.sort((a, b) =>
            a.name.localeCompare(b.name)
        );


    }


    if (sort === "nameDesc") {


        filtered.sort((a, b) =>
            b.name.localeCompare(a.name)
        );


    }


    if (sort === "idAsc") {


        filtered.sort((a, b) =>
            a.id.localeCompare(b.id)
        );


    }




    // Clear current table
    tableBody.innerHTML = "";




    // ======================================
    // DISPLAY EACH CUSTOMER
    // ======================================


    filtered.forEach(customer => {


        const row = document.createElement("tr");


        row.innerHTML = `


            <td>
                <span class="customer-id">
                    ${customer.id}
                </span>
            </td>




            <td>


                <div class="customer-name-cell">


                    <div class="customer-avatar">
                        ${getInitials(customer.name)}
                    </div>


                    <span class="customer-name">
                        ${customer.name}
                    </span>


                </div>


            </td>




            <td>


                <span class="customer-email">
                    ${customer.email}
                </span>


            </td>




            <td>


                <span class="customer-contact">
                    ${customer.contact}
                </span>


            </td>




            <td>


                <span class="status ${customer.status.toLowerCase()}">


                    ${customer.status}


                </span>


            </td>




            <td>


                <div class="action-buttons">


                    <!-- VIEW BUTTON -->
                    <button
                        class="action-btn view"
                        title="View Customer"
                        data-index="${customers.indexOf(customer)}">


                        <i class="fa-regular fa-eye"></i>


                    </button>




                    <!-- DELETE BUTTON -->
                    <button
                        class="action-btn delete"
                        title="Delete Customer"
                        data-index="${customers.indexOf(customer)}">


                        <i class="fa-regular fa-trash-can"></i>


                    </button>


                </div>


            </td>


        `;


        tableBody.appendChild(row);


    });




    // ======================================
    // EMPTY STATE
    // ======================================


    if (filtered.length === 0) {


        emptyState.classList.add("show");


    } else {


        emptyState.classList.remove("show");


    }




    // ======================================
    // RESULT COUNT
    // ======================================


    const resultCount =
        document.getElementById("resultCount");


    resultCount.textContent =
        `Showing ${filtered.length} customer${filtered.length !== 1 ? "s" : ""}`;




    // Update summary cards
    updateSummary();


}




// ==========================================
// UPDATE SUMMARY CARDS
// ==========================================


function updateSummary() {


    const total = customers.length;


    const returning =
        customers.filter(customer =>
            customer.returning === true
        ).length;


    const newCustomers =
        total - returning;




    document.getElementById("totalCustomers").textContent =
        total.toLocaleString();


    document.getElementById("returningCustomers").textContent =
        returning.toLocaleString();


    document.getElementById("newCustomers").textContent =
        newCustomers.toLocaleString();


}




// ==========================================
// OPEN MODAL
// ==========================================


function openModal(modal) {


    modal.classList.add("show");


    document.body.style.overflow = "hidden";


}




// ==========================================
// CLOSE MODAL
// ==========================================


function closeModal(modal) {


    modal.classList.remove("show");




    // Enable scrolling again
    if (!document.querySelector(".modal-overlay.show")) {


        document.body.style.overflow = "";


    }


}




// ==========================================
// SHOW TOAST MESSAGE
// ==========================================


function showToast(message) {


    const toast =
        document.getElementById("toast");


    const toastMessage =
        document.getElementById("toastMessage");




    toastMessage.textContent = message;


    toast.classList.add("show");




    setTimeout(() => {


        toast.classList.remove("show");


    }, 2500);


}




// ==========================================
// SEARCH
// ==========================================


searchInput.addEventListener("input", function() {


    renderCustomers();


});




// ==========================================
// STATUS FILTER
// ==========================================


statusFilter.addEventListener("change", function() {


    renderCustomers();


});




// ==========================================
// SORT CUSTOMERS
// ==========================================


sortSelect.addEventListener("change", function() {


    renderCustomers();


});




// ==========================================
// CUSTOMER ACTION BUTTONS
// ==========================================


tableBody.addEventListener("click", function(event) {


    const button =
        event.target.closest(".action-btn");




    // If user did not click a button
    if (!button) {
        return;
    }




    const index =
        Number(button.dataset.index);




    const customer =
        customers[index];




    // ======================================
    // VIEW CUSTOMER
    // ======================================


    if (button.classList.contains("view")) {


        document.getElementById("viewAvatar").textContent =
            getInitials(customer.name);


        document.getElementById("viewName").textContent =
            customer.name;


        document.getElementById("viewId").textContent =
            customer.id;


        document.getElementById("viewEmail").textContent =
            customer.email;


        document.getElementById("viewContact").textContent =
            customer.contact;


        document.getElementById("viewStatus").textContent =
            customer.status;




        openModal(viewModal);


    }




    // ======================================
    // DELETE CUSTOMER
    // ======================================


    if (button.classList.contains("delete")) {


        customerToDelete = index;




        document.getElementById(
            "deleteCustomerName"
        ).textContent = customer.name;




        openModal(deleteModal);


    }


});




// ==========================================
// OPEN ADD CUSTOMER MODAL
// ==========================================


document
    .getElementById("openAddCustomer")
    .addEventListener("click", function() {


        openModal(addModal);


    });




// ==========================================
// ADD CUSTOMER
// ==========================================


document
    .getElementById("addCustomerForm")
    .addEventListener("submit", function(event) {


        // Prevent page refresh
        event.preventDefault();




        // Get form values
        const newCustomer = {


            id: document
                .getElementById("customerId")
                .value
                .trim(),


            name: document
                .getElementById("customerName")
                .value
                .trim(),


            email: document
                .getElementById("customerEmail")
                .value
                .trim(),


            contact: document
                .getElementById("customerContact")
                .value
                .trim(),


            status: document
                .getElementById("customerStatus")
                .value,


            returning: false


        };




        // Add customer to beginning of array
        customers.unshift(newCustomer);




        // Clear form
        event.target.reset();




        // Close modal
        closeModal(addModal);




        // Refresh customer table
        renderCustomers();




        // Show success message
        showToast(
            "Customer added successfully."
        );


    });




// ==========================================
// DELETE CUSTOMER
// ==========================================


document
    .getElementById("confirmDelete")
    .addEventListener("click", function() {


        // Make sure a customer is selected
        if (customerToDelete === null) {
            return;
        }




        // Remove customer
        customers.splice(customerToDelete, 1);




        // Reset selected customer
        customerToDelete = null;




        // Close modal
        closeModal(deleteModal);




        // Refresh table
        renderCustomers();




        // Show message
        showToast(
            "Customer deleted successfully."
        );


    });




// ==========================================
// CLOSE MODAL BUTTONS
// ==========================================


document
    .querySelectorAll("[data-close]")
    .forEach(button => {


        button.addEventListener("click", function() {


            const modal =
                document.getElementById(
                    button.dataset.close
                );


            closeModal(modal);


        });


    });




// ==========================================
// CLOSE MODAL WHEN CLICKING OUTSIDE
// ==========================================


document
    .querySelectorAll(".modal-overlay")
    .forEach(overlay => {


        overlay.addEventListener("click", function(event) {


            // Only close if clicking the dark background
            if (event.target === overlay) {


                closeModal(overlay);


            }


        });


    });




// ==========================================
// ESCAPE KEY CLOSES MODAL
// ==========================================


document.addEventListener("keydown", function(event) {


    if (event.key === "Escape") {


        document
            .querySelectorAll(".modal-overlay.show")
            .forEach(modal => {


                closeModal(modal);


            });


    }


});




// ==========================================
// SIDEBAR DEMO LINKS
// ==========================================


document
    .querySelectorAll(
        ".sidebar-nav .nav-item, .sidebar-bottom .nav-item"
    )
    .forEach(link => {


        link.addEventListener("click", function(event) {


            if (link.getAttribute("href") === "#") {


                event.preventDefault();




                const label =
                    link.querySelector("span").textContent;




                // Do not show message for current page
                if (label !== "Customers") {


                    showToast(
                        `${label} page link clicked.`
                    );


                }


            }


        });


    });

renderCustomers();



