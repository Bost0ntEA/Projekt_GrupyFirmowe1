import express from "express";
import bodyParser from "body-parser";
import pool from './database.js';
import bcrypt from "bcrypt";

const app = express();
const port = 3000;
const saltRounds = 10;


app.set('view engine', 'ejs');
app.set('views', './views');

 
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));


app.get("/", (req, res) => {
    res.render("HomePage");
});


app.get("/login", (req, res) => {
    const login = req;
    res.render("LoginPage");
});

app.get("/register", (req, res) => {

res.render("RegistrationPage");

});

app.post("/register", async(req, res) => {
    const username = req.body.username;
    const password = req.body.password;
    const companyName = req.body.companyName;
    const nip = req.body.nip;


    if(nip.length !== 10){
        res.send("Zły NIP");
    }
    if(username.length>30){
        res.render("za dlugi login (30 znakow max)");
    }

    const result = await pool.query("SELECT * FROM Firma WHERE NIP=$1",[nip]);

    if(result.rows.length !==0){
        res.send("<h1> Taki NIP już istnieje </h1>");
    }else{
        try {

            const hashedPassword = await bcrypt.hash(password, saltRounds);


            const maxIdResult = await pool.query("SELECT COALESCE(MAX(IdKonta), 0) AS max_id FROM Loginy;");
            const nextId = maxIdResult.rows[0].max_id + 1;


            const loginResult = await pool.query(
                "INSERT INTO Loginy(IdKonta, Login, Haslo, Rola) VALUES ($1, $2, $3, 'firma') RETURNING IdKonta;",
                [nextId, username, hashedPassword]
            );


            const idKonta = loginResult.rows[0].idkonta;


            await pool.query(
                "INSERT INTO Firma(IdKontaFirmy, Nazwa, NIP) VALUES ($1, $2, $3);",
                [idKonta, companyName, nip]
            );

            // console.log("Account created successfully!");
        } catch (error) {
            console.error("Error creating account:", error);
        }

    // console.log("Udalo sie");
    res.render("LoginPage");
}
});

app.post("/login", async(req, res) => {
    const login = req.body.username;
    const password = req.body.password;
    console.log(password);
    try{
        const result = await pool.query("SELECT * FROM Loginy WHERE Login=$1",[login]);

        if(result.rows.length > 0){
            const user = result.rows[0];
            // console.log(user);
            const hashedPassword = user.haslo;
            const rola = user.rola;
            console.log(hashedPassword);
            bcrypt.compare(password, hashedPassword, async (err, isMatch) => {
                if (err) {
                    console.log("error crypto");
                } else {
                    if (isMatch) {
                        if (rola === "pracownik") {
                            const userId = user.idkonta
                            res.redirect(`/EmployeeView/${userId}`);
                        } else if (rola === "firma") {
                            const id = user.idkonta
                            const companyResult = await pool.query("SELECT Nazwa FROM Firma WHERE IdKontaFirmy = $1", [id]);
                            const companyName = companyResult.rows[0]?.nazwa || "Server Error";
                            res.render("CompanyProfile", { companyName, companyId: id});
                        } else {
                            res.status(403).send("Access denied.");
                        }
                    } else {
                        console.log("Invalid credentials.");
                        res.status(401).send("Invalid username or password.");
                    }
                }
            })
        }else {
            res.status(401).send("Wrong Password or Login.");
        }
    }catch(error){
        console.error("Error creating login:", error);
        res.status(401).send("Acces Denied");
    }
});

app.post("/logout", async (req, res) => {
    res.redirect("/login");
});


app.get("/CompanyPage/:id", async (req, res) => {
    const companyId = req.params.id;

    try {
        const companyResult = await pool.query("SELECT Nazwa FROM Firma WHERE IdKontaFirmy = $1", [companyId]);
        const companyName = companyResult.rows[0]?.nazwa || res.render("LoginPage");
        // if (companyName)


        res.render("CompanyProfile", { companyName, companyId });
    } catch (error) {
        console.error("Error fetching company profile:", error);
        res.status(500).send("Internal Server Error");
    }
});

app.get("/CompanyPage/:id/CompanyProfile", async (req, res) => {
    const companyId = req.params.id;

    try {
        const companyResult = await pool.query("SELECT Nazwa FROM Firma WHERE IdKontaFirmy = $1", [companyId]);
        const companyName = companyResult.rows[0]?.nazwa || "Nieznana firma";

        res.render("CompanyProfile", { companyId, companyName });
    } catch (error) {
        console.error("Error fetching company profile:", error);
        res.status(500).send("Wystąpił błąd wewnętrzny serwera.");
    }
});

app.get("/CompanyPage/:id/CreateWorker", async (req, res) => {
     const companyId = req.params.id;
    res.render("CreateWorker",{companyId});
});

app.post("/CompanyPage/:id/CreateWorker", async (req, res) => {
    const companyId = req.params.id;
    const { workerName, workerLogin, workerPassword } = req.body;

    console.log(workerName, workerLogin, workerPassword);

    try {
        const loginRes = await pool.query(
            "SELECT * FROM Loginy WHERE Login = $1",
            [workerLogin]
        );
        if (loginRes.rows.length !== 0) {
            return res.status(400).send("Taki login już istnieje.");
        }

        const hashedPassword = await bcrypt.hash(workerPassword, saltRounds);
        const insertLogin = await pool.query(
            "INSERT INTO Loginy (Login, Haslo, Rola) VALUES ($1, $2, 'pracownik') RETURNING IdKonta;",
            [workerLogin, hashedPassword]
        );
        const accountId = insertLogin.rows[0].idkonta;

        const insertWorker = await pool.query(
            "INSERT INTO Pracownik (Imie, IdKonta) VALUES ($1, $2) RETURNING IdPracownika;",
            [workerName, accountId]
        );
        const workerId = insertWorker.rows[0].idpracownika;

        await pool.query(
            "INSERT INTO Firma_Pracownik (IdKontaFirmy, IdPracownika) VALUES ($1, $2);",
            [companyId, workerId]
        );

        const companyResult = await pool.query("SELECT Nazwa FROM Firma WHERE IdKontaFirmy = $1", [companyId]);
        const companyName = companyResult.rows[0]?.nazwa || "Server Error";
        res.render("CompanyProfile", { companyName, companyId: companyId});
    } catch (error) {
        console.error("Błąd podczas tworzenia pracownika:", error.message);
        res.status(500).send("Wystąpił błąd serwera.");
    }
});

app.get("/CompanyPage/:id/CompanyWorkers", async (req, res) => {
    const companyId = req.params.id;

    try {
        const resultWorkers = await pool.query(
            "SELECT p.IdPracownika, p.Imie FROM Pracownik p JOIN Firma_Pracownik fp ON fp.IdPracownika=p.IdPracownika WHERE fp.IdKontaFirmy=$1",
            [companyId]
        );

        const workers = resultWorkers.rows.map(worker => ({
            id: worker.idpracownika,
            name: worker.imie,
        }));

        const companyResult = await pool.query("SELECT Nazwa FROM Firma WHERE IdKontaFirmy = $1", [companyId]);
        const companyName = companyResult.rows[0]?.nazwa || "Nieznana firma";

        res.render("CompanyWorkers", { workers, companyName, companyId });
    } catch (error) {
        console.error("Error fetching workers:", error);
        res.status(500).send("Wystąpił błąd wewnętrzny serwera.");
    }
});

app.get('/CompanyPage/:id/CompanyWorkers/:idWorker', async (req, res) => {
    const { id, idWorker } = req.params;

    try {
        const result = await pool.query('SELECT Imie FROM Pracownik WHERE IdPracownika = $1', [idWorker]);
        const worker = result.rows[0];

        if (!worker) {
            return res.status(404).send('Pracownik nie znaleziony.');
        }

        res.render('EditWorker', {
            companyId: id,
            workerId: idWorker,
            workerName: worker.imie,
        });
    } catch (error) {
        console.error('Błąd podczas pobierania pracownika:', error);
        res.status(500).send('Wystąpił błąd.');
    }
});

app.post('/CompanyPage/:id/CompanyWorkers/:idWorker', async (req, res) => {
    const { id, idWorker } = req.params;
    const { workerName } = req.body;

    try {
        await pool.query('UPDATE Pracownik SET Imie = $1 WHERE IdPracownika = $2', [workerName, idWorker]);

        res.redirect(`/CompanyPage/${id}/CompanyWorkers`);
    } catch (error) {
        console.error('Błąd podczas aktualizacji pracownika:', error);
        res.status(500).send('Wystąpił błąd podczas aktualizacji danych.');
    }
});

app.get('/CompanyPage/:id/ManageGroup', async (req, res) => {
    const { id: companyId } = req.params;
    const { page = 1, limit = 5 } = req.query;
    const offset = (page - 1) * limit;

    try {
        const resultGroups = await pool.query(
            `SELECT IdGrupy AS id, NazwaGrupy AS name, RolaGrupy AS role 
             FROM Grupa 
             WHERE IdKontaFirmy = $1 AND czyUsunieta=0
             LIMIT $2 OFFSET $3`,
            [companyId, limit, offset]
        );

        const countResult = await pool.query(
            `SELECT COUNT(*) AS total 
             FROM Grupa 
             WHERE IdKontaFirmy = $1 AND czyUsunieta=0 `,
            [companyId]
        );

        const totalGroups = parseInt(countResult.rows[0].total, 10);
        const totalPages = Math.ceil(totalGroups / limit);

        res.render('ManageGroup', {
            companyId,
            groups: resultGroups.rows,
            currentPage: parseInt(page, 10),
            totalPages,
        });
    } catch (error) {
        console.error('Error fetching groups:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.post('/CompanyPage/:id/CreateGroup', async (req, res) =>{
    const { id } = req.params;
    const { groupName, groupRole } = req.body;

    const result = await pool.query("INSERT INTO Grupa(NazwaGrupy, RolaGrupy, czyUsunieta, IdKontaFirmy) VALUES($1, $2, $3, $4)",[groupName, groupRole, 0, id]);
    res.redirect(`/CompanyPage/${id}/ManageGroup`);
});

app.get('/CompanyPage/:id/ManageGroup/:idGroup', async (req, res) => {
    const { id: companyId, idGroup } = req.params;

    try {
        const groupResult = await pool.query(
            `SELECT NazwaGrupy AS name, RolaGrupy AS role 
             FROM Grupa 
             WHERE IdGrupy = $1 AND IdKontaFirmy = $2 AND czyUsunieta=0`,
            [idGroup, companyId]
        );

        if (groupResult.rows.length === 0) {
            return res.status(404).send('Group not found');
        }

        const group = groupResult.rows[0];

        const assignedWorkersResult = await pool.query(
            `SELECT p.IdPracownika AS id, p.Imie AS name 
             FROM Pracownik p
             JOIN Pracownik_Grupa gp ON p.IdPracownika = gp.IdPracownika
             WHERE gp.IdGrupy = $1`,
            [idGroup]
        );

        const allWorkersResult = await pool.query(
            `SELECT p.IdPracownika AS id, Imie AS name 
            FROM Pracownik p JOIN Firma_Pracownik fp ON p.IdPracownika=fp.IdPracownika
            WHERE IdKontaFirmy = $1
            EXCEPT
            SELECT p.IdPracownika AS id, Imie AS name 
            FROM Pracownik p JOIN Pracownik_Grupa pg ON p.IdPracownika=pg.IdPracownika WHERE IdGrupy=$2`,
            [companyId, idGroup]
        );

        res.render('EditGroup', {
            companyId,
            groupId: idGroup,
            group,
            assignedWorkers: assignedWorkersResult.rows,
            allWorkers: allWorkersResult.rows,
        });
    } catch (error) {
        console.error('Error fetching group details:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.post('/CompanyPage/:id/EditGroup/:idGroup/Update', async (req, res) =>{
    const { id ,idGroup} = req.params;
    const {groupName, groupRole} = req.body;

    const result = await pool.query("UPDATE Grupa SET NazwaGrupy=$1, RolaGrupy=$2 WHERE IdGrupy=$3",[groupName, groupRole, idGroup]);

    res.redirect(`/CompanyPage/${id}/ManageGroup/${idGroup}`);
});

app.post('/CompanyPage/:id/EditGroup/:idGroup/AddWorkers', async (req, res) =>{
    const { id ,idGroup} = req.params;
    const {workers} = req.body;
    const companyId=id

    const { page = 1, limit = 5 } = req.query;
    const offset = (page - 1) * limit;

    const resultGroups = await pool.query(
        `SELECT IdGrupy AS id, NazwaGrupy AS name, RolaGrupy AS role 
             FROM Grupa 
             WHERE IdKontaFirmy = $1 
             LIMIT $2 OFFSET $3`,
        [companyId, limit, offset]
    );

    const countResult = await pool.query(
        `SELECT COUNT(*) AS total 
             FROM Grupa 
             WHERE IdKontaFirmy = $1`,
        [companyId]
    );

    const totalGroups = parseInt(countResult.rows[0].total, 10);
    const totalPages = Math.ceil(totalGroups / limit);



    if (workers && workers.length !== 0) {
        try {
            for (const workerId of workers) {
                await pool.query(
                    'INSERT INTO Pracownik_Grupa (IdPracownika, IdGrupy) VALUES ($1, $2)',
                    [workerId, idGroup]
                );
            }

            res.render('ManageGroup', {
                companyId,
                groups: resultGroups.rows,
                currentPage: parseInt(page, 10),
                totalPages,
            });
        } catch (error) {
            res.status(403).send("error")
        }

        res.render('ManageGroup', {
            companyId,
            groups: resultGroups.rows,
            currentPage: parseInt(page, 10),
            totalPages,
        });
    }

});


app.get('/EmployeeView/:userId', async (req, res) => {
    const { userId } = req.params;
    console.log("=================================================");
    try {
        console.log("=================================================");
        const workerResult = await pool.query(
            `SELECT Imie AS name, p.IdPracownika 
             FROM Pracownik p 
             WHERE IdKonta = $1`,
            [userId]
        );

        if (workerResult.rows.length === 0) {
            return res.status(404).send('Pracownik nie został znaleziony.');
        }


        const worker = workerResult.rows[0];

        const groupsResult = await pool.query(
            `SELECT g.NazwaGrupy AS name, g.RolaGrupy AS role 
             FROM Grupa g
             JOIN Pracownik_Grupa pg ON g.IdGrupy = pg.IdGrupy
             JOIN Pracownik p ON p.IdPracownika=pg.IdPracownika
             WHERE p.IdKonta = $1 AND g.czyUsunieta=0`,
            [userId]
        );

        res.render('EmployeeView', {
            companyId: worker.companyId,
            worker,
            groups: groupsResult.rows,
        });
    } catch (error) {
        console.error('Błąd podczas pobierania danych pracownika:', error);
        res.status(500).send('Wystąpił błąd podczas przetwarzania żądania.');
    }
});

app.post('/CompanyPage/:id/EditGroup/:idGroup/removeWorkers', async (req, res) => {
    const { id: companyId, idGroup } = req.params;
    const { removeWorkers } = req.body;

    try {
        if (removeWorkers && removeWorkers.length > 0) {
            const removeWorkersArray = Array.isArray(removeWorkers) ? removeWorkers : [removeWorkers];

            await Promise.all(removeWorkersArray.map(workerId =>
                pool.query('DELETE FROM Pracownik_Grupa WHERE IdPracownika = $1 AND IdGrupy = $2', [workerId, idGroup])
            ));
        }

        res.redirect(`/CompanyPage/${companyId}/ManageGroup`);
    } catch (error) {
        console.error('Error removing workers from group:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.post('/CompanyPage/:id/EditGroup/:idGroup/deleteGroup', async (req, res) => {
    const { id: companyId, idGroup } = req.params;

    try {
        await pool.query(
            'UPDATE Grupa SET czyUsunieta = $1 WHERE IdGrupy = $2',
            [1, idGroup]
        );

        res.redirect(`/CompanyPage/${companyId}/ManageGroup`);
    } catch (error) {
        const err= 'Error deleting group:'

        res.send("ErrorPageCompany",{error});
    }
});


app.listen(port, () => {
    console.log('Serwer działa na http://localhost:3000');
});