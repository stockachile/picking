let orderList = [];
let currentOrderIndex = 0;
let completedOrdersCount = 0;

function navigateOrder(direction) {
    currentOrderIndex += direction;  // Cambiar el índice (anterior o siguiente)
    currentOrderIndex = Math.max(0, Math.min(currentOrderIndex, orderList.length - 1)); // Asegurar que el índice esté dentro de los límites
    displayCurrentOrder();  // Volver a mostrar el pedido actualizado
}

function clearDataInput() {
    // Limpiar el contenido del campo de entrada
    document.getElementById("dataInput").value = "";
}


function handleDataProcessing() {
    const inputData = document.getElementById("dataInput").value.trim();
    
    if (inputData === "") {
        alert("Por favor, pega los datos primero.");
        return;
    }

    parseData(inputData);
}

function parseData(data) {
    const rows = data.split("\n"); // Dividimos por filas
    console.log("Filas: ", rows); // Depuración

    orderList = [];
    
    rows.forEach(row => {
        const columns = row.split("\t").map(col => col.trim()); // Separamos por tabulaciones y limpiamos los espacios
        console.log("Columnas: ", columns); // Depuración
        
        if (columns.length === 5) {
            const orderNumber = columns[0];
            const agenda = columns[1];
            const quantity = parseInt(columns[2], 10);
            const sku = columns[3];
            const productName = columns[4];
            
            if (!orderNumber || isNaN(quantity) || !sku || !productName) {
                console.error("Datos inválidos en la fila:", row);
                return;  // No procesamos esta fila
            }
            
            let order = orderList.find(order => order.number === orderNumber);
            if (!order) {
                order = { number: orderNumber, items: [] };
                orderList.push(order);
            }
            
            order.items.push({
                agenda,
                quantity,
                sku,
                name: productName,
                scannedCount: 0,
                scanned: []  // Lista de ítems escaneados
            });
        } else {
            console.error("Fila con formato incorrecto: ", row);
        }
    });

    console.log("Lista de Pedidos: ", orderList); // Depuración

    updateHeaderSummary();
    displayCurrentOrder();
    updatePendingOrdersList(); // Llamamos aquí para actualizar la lista de pedidos pendientes al finalizar la carga
}

function displayCurrentOrder() {
    const currentOrder = orderList[currentOrderIndex];
    const orderDiv = document.createElement("div");
    orderDiv.classList.add("order");

    const orderHeader = document.createElement("h3");
    orderHeader.textContent = `Pedido ${currentOrder.number}`;
    orderDiv.appendChild(orderHeader);

    const ul = document.createElement("ul");
    currentOrder.items.forEach(item => {
        const li = document.createElement("li");
        li.textContent = `${item.name} (Cantidad: ${item.quantity})`;
        ul.appendChild(li);
    });

    const scanSummary = document.createElement("div");
    scanSummary.classList.add("scan-summary");
    const scannedCount = currentOrder.items.reduce((acc, item) => acc + item.scannedCount, 0);
    const scannedSkus = new Set(currentOrder.items.filter(item => item.scannedCount > 0).map(item => item.sku));

    scanSummary.innerHTML = ` 
        <p><strong>Escaneados:</strong> ${scannedCount} / ${currentOrder.items.reduce((acc, item) => acc + item.quantity, 0)} productos</p>
        <p><strong>SKUs Escaneados:</strong> ${scannedSkus.size} / ${currentOrder.items.length} diferentes SKUs</p>
    `;
    orderDiv.appendChild(scanSummary);

    // Caja para escanear
    const scanInputDiv = document.createElement("div");
    scanInputDiv.classList.add("scan-input");
    
    const scanInput = document.createElement("input");
    scanInput.type = "text";
    scanInput.placeholder = "Escanea el SKU aquí...";
    scanInput.id = "skuInput";
    
    // Añadir un listener para el evento 'Enter' (keycode 13)
    scanInput.addEventListener("keydown", function(event) {
        if (event.key === "Enter") {
            scanSku(scanInput.value);  // Escanear el SKU automáticamente
            scanInput.value = "";  // Limpiar el campo de texto después de escanear
        }
    });

    orderDiv.appendChild(scanInputDiv);
    orderDiv.appendChild(scanInput);

    // Listado de productos escaneados
    const scannedListDiv = document.createElement("div");
    scannedListDiv.classList.add("scanned-list");

    currentOrder.items.forEach(item => {
        item.scanned.forEach(sku => {
            const scannedItemDiv = document.createElement("div");
            scannedItemDiv.classList.add("scanned-item");
            scannedItemDiv.innerHTML = `
                ${sku} (Escaneado ${item.scannedCount} veces)
                <button onclick="removeScannedItem('${sku}', '${currentOrder.number}')">Eliminar</button>
            `;
            scannedListDiv.appendChild(scannedItemDiv);
        });
    });
    orderDiv.appendChild(scannedListDiv);

    // Mostrar los productos que faltan por escanear
    const pendingProductsDiv = document.createElement("div");
    pendingProductsDiv.classList.add("pending-products");
    const pendingProductsHeader = document.createElement("h4");
    pendingProductsHeader.textContent = "Productos Pendientes de Escanear";
    pendingProductsDiv.appendChild(pendingProductsHeader);

    const pendingProductsList = document.createElement("ul");
    currentOrder.items.forEach(item => {
        if (item.scannedCount < item.quantity) {
            const li = document.createElement("li");
            li.textContent = `${item.name} - SKU: ${item.sku} - Cantidad pendiente: ${item.quantity - item.scannedCount}`;
            pendingProductsList.appendChild(li);
        }
    });
    pendingProductsDiv.appendChild(pendingProductsList);
    orderDiv.appendChild(pendingProductsDiv);

    // Marca el pedido como completo si todos los productos han sido escaneados
    const allItemsScanned = currentOrder.items.every(item => item.scannedCount === item.quantity);
    if (allItemsScanned) {
        orderDiv.classList.add("order-completed");
    } else {
        orderDiv.classList.add("order-pending");
    }

    // Agregar el botón para marcar como completado o listo para despacho
    const markCompletedButton = document.createElement("button");
    if (allItemsScanned && !currentOrder.completed) {
        markCompletedButton.textContent = "Marcar como Completo";
        markCompletedButton.classList.add("mark-completed");
        markCompletedButton.onclick = () => markOrderCompleted(currentOrder);
    } else if (currentOrder.completed) {
        markCompletedButton.textContent = "Listo para Despacho";
        markCompletedButton.disabled = true; // El botón está deshabilitado una vez completado
    } else {
        markCompletedButton.disabled = true; // Si no está completo, no mostramos el botón
    }

    orderDiv.appendChild(markCompletedButton);

    document.getElementById("ordersContainer").innerHTML = ""; // Limpiar antes de mostrar
    document.getElementById("ordersContainer").appendChild(orderDiv);

    // Control de botones de navegación
    updateNavigationButtons();
}


function updateNavigationButtons() {
    // Botones de navegación
    const navButtons = document.getElementById("navButtons");
    navButtons.style.display = orderList.length > 1 ? "block" : "none"; // Mostrar botones solo si hay más de un pedido

    // Deshabilitar el botón "Anterior" si estamos en el primer pedido
    document.getElementById("navButtons").querySelector("button:nth-child(1)").disabled = currentOrderIndex === 0;

    // Deshabilitar el botón "Siguiente" si estamos en el último pedido
    document.getElementById("navButtons").querySelector("button:nth-child(2)").disabled = currentOrderIndex === orderList.length - 1;
}


function scanSku(sku) {
    const currentOrder = orderList[currentOrderIndex];
    let scannedItem = currentOrder.items.find(item => item.sku === sku);

    if (scannedItem) {
        // Verificar si ya se ha escaneado la cantidad total de este producto
        if (scannedItem.scannedCount >= scannedItem.quantity) {
            alert(`No se puede escanear más de ${scannedItem.quantity} unidades de ${scannedItem.name}.`);
            return; // Detener la función si se ha alcanzado la cantidad máxima
        }
        
        // Incrementar el contador de escaneos si no se ha alcanzado el límite
        scannedItem.scannedCount++;
        scannedItem.scanned.push(sku);
        displayCurrentOrder();
    } else {
        alert("SKU no encontrado en el pedido.");
    }
}


function removeScannedItem(sku, orderNumber) {
    const currentOrder = orderList.find(order => order.number === orderNumber);
    let scannedItem = currentOrder.items.find(item => item.sku === sku);
    const index = scannedItem.scanned.indexOf(sku);

    if (index !== -1) {
        scannedItem.scanned.splice(index, 1);
        scannedItem.scannedCount--;
    }

    displayCurrentOrder();
}

function markOrderCompleted(order) {
    const allItemsScanned = order.items.every(item => item.scannedCount === item.quantity);

    if (allItemsScanned) {
        order.completed = true; // Marcar el pedido como completado
        completedOrdersCount++; // Incrementar el contador de pedidos completados
        updateHeaderSummary(); // Actualizar el encabezado con el contador de completados
        updatePendingOrdersList(); // Actualizar la lista de pedidos pendientes
        alert(`Pedido ${order.number} completado.`);
    } else {
        alert(`No todos los productos han sido escaneados en el pedido ${order.number}`);
    }
}

function updateHeaderSummary() {
    document.getElementById("totalOrders").textContent = orderList.length;
    document.getElementById("completedOrders").textContent = completedOrdersCount;
}

function updatePendingOrdersList() {
    const pendingOrdersList = document.getElementById("pendingOrdersList");
    pendingOrdersList.innerHTML = ""; // Limpiar antes de agregar nuevos pedidos

    orderList.forEach(order => {
        const isCompleted = order.items.every(item => item.scannedCount === item.quantity);

        if (!isCompleted) {
            const listItem = document.createElement("li");
            listItem.textContent = `Pedido ${order.number} - Agenda: ${order.items[0].agenda} - Estado: Pendiente de Pickear`;
            pendingOrdersList.appendChild(listItem);
        }
    });
}
// Función para descargar la información de los productos escaneados
function downloadScannedData() {
    let csvData = [
        ["Pedido", "SKU", "Nombre del Producto", "Cantidad Escaneada", "Agenda"]  // Encabezados del CSV
    ];

    // Recorrer la lista de pedidos y los productos escaneados
    orderList.forEach(order => {
        order.items.forEach(item => {
            item.scanned.forEach(sku => {
                // Agregar una fila por cada SKU escaneado
                csvData.push([
                    order.number, // Pedido
                    sku,          // SKU
                    item.name,    // Nombre del Producto
                    item.scannedCount, // Cantidad Escaneada
                    item.agenda   // Agenda
                ]);
            });
        });
    });

    // Crear un contenido CSV en formato de texto
    const csvContent = csvData.map(e => e.join(",")).join("\n");

    // Crear un Blob con el contenido CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

    // Crear un enlace temporal para descargar el archivo CSV
    const link = document.createElement("a");
    if (link.download !== undefined) {
        // Crear un URL para el Blob y asignarlo al enlace
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "respaldo_sku_scaneados.csv"); // Nombre del archivo CSV
        link.style.visibility = 'hidden'; // Ocultar el enlace

        // Añadir el enlace al documento y simular un clic para descargar
        document.body.appendChild(link);
        link.click();

        // Eliminar el enlace del documento después de la descarga
        document.body.removeChild(link);
    }
}

// Crear y agregar el botón de descarga solo una vez
function addDownloadButton() {
    // Verificar si el botón ya existe
    if (!document.getElementById("downloadBtn")) {
        const downloadButton = document.createElement("button");
        downloadButton.textContent = "Descargar Respaldo de SKUs Escaneados";
        downloadButton.classList.add("download-btn"); // Puedes agregarle clases para darle estilo
        downloadButton.id = "downloadBtn";  // Asignar un id único para poder identificarlo
        downloadButton.onclick = downloadScannedData; // Asociar la función al botón

        // Añadir el botón a un contenedor fijo (fuera de `ordersContainer`)
        const fixedContainer = document.getElementById("downloadContainer");
        if (fixedContainer) {
            fixedContainer.appendChild(downloadButton);
        }
    }
}

// Asegúrate de llamar a esta función una vez que hayas cargado los datos
function parseData(data) {
    const rows = data.split("\n"); // Dividimos por filas
    console.log("Filas: ", rows); // Depuración

    orderList = [];
    
    rows.forEach(row => {
        const columns = row.split("\t").map(col => col.trim()); // Separamos por tabulaciones y limpiamos los espacios
        console.log("Columnas: ", columns); // Depuración
        
        if (columns.length === 5) {
            const orderNumber = columns[0];
            const agenda = columns[1];
            const quantity = parseInt(columns[2], 10);
            const sku = columns[3];
            const productName = columns[4];
            
            if (!orderNumber || isNaN(quantity) || !sku || !productName) {
                console.error("Datos inválidos en la fila:", row);
                return;  // No procesamos esta fila
            }
            
            let order = orderList.find(order => order.number === orderNumber);
            if (!order) {
                order = { number: orderNumber, items: [] };
                orderList.push(order);
            }
            
            order.items.push({
                agenda,
                quantity,
                sku,
                name: productName,
                scannedCount: 0,
                scanned: []  // Lista de ítems escaneados
            });
        } else {
            console.error("Fila con formato incorrecto: ", row);
        }
    });

    console.log("Lista de Pedidos: ", orderList); // Depuración

    updateHeaderSummary();
    displayCurrentOrder();
    updatePendingOrdersList(); // Llamamos aquí para actualizar la lista de pedidos pendientes al finalizar la carga

    addDownloadButton(); // Agregar el botón de descarga después de cargar los datos
}

// Estilo del Botón (CSS opcional)
const css = `
.download-btn {
    background-color: #5e17eb; /* Morado */
    color: #ffffff; /* Blanco */
    padding: 10px 20px;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    font-size: 16px;
    margin-top: 20px;
}

.download-btn:hover {
    background-color: #05fa93; /* Verde claro al pasar el mouse */
}
`;

// Incluir el CSS en el documento (opcional)
const style = document.createElement('style');
style.textContent = css;
document.head.appendChild(style);
