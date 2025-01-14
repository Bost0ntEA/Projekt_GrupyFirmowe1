-- Created by Vertabelo (http://vertabelo.com)
-- Last modification date: 2025-01-13 14:56:30.817

-- tables
-- Table: Firma
CREATE TABLE Firma (
    IdKontaFirmy int  NOT NULL,
    Nazwa varchar(50)  NOT NULL,
    NIP varchar(20)  NOT NULL,
    CONSTRAINT Firma_pk PRIMARY KEY (IdKontaFirmy)
);

-- Table: Firma_Pracownik
CREATE TABLE Firma_Pracownik (
    IdPracownika int  NOT NULL,
    IdKontaFirmy int  NOT NULL,
    CONSTRAINT Firma_Pracownik_pk PRIMARY KEY (IdPracownika,IdKontaFirmy)
);

-- Table: Grupa
CREATE TABLE Grupa (
    IdGrupy serial  NOT NULL,
    NazwaGrupy varchar(60)  NOT NULL,
    RolaGrupy varchar(50)  NOT NULL,
    czyUsunieta int  NULL,
    IdKontaFirmy int  NOT NULL,
    CONSTRAINT Grupa_pk PRIMARY KEY (IdGrupy)
);

-- Table: Loginy
CREATE TABLE Loginy (
    IdKonta serial  NOT NULL,
    Login varchar(30)  NOT NULL,
    Haslo varchar(100)  NOT NULL,
    Rola varchar(60)  NOT NULL,
    CONSTRAINT Loginy_pk PRIMARY KEY (IdKonta)
);

-- Table: Pracownik
CREATE TABLE Pracownik (
    IdPracownika serial  NOT NULL,
    Imie varchar(50)  NOT NULL,
    IdKonta int  NOT NULL,
    CONSTRAINT Pracownik_pk PRIMARY KEY (IdPracownika)
);

-- Table: Pracownik_Grupa
CREATE TABLE Pracownik_Grupa (
    IdGrupaPracownik serial  NOT NULL,
    IdPracownika int  NOT NULL,
    IdGrupy int  NOT NULL,
    CONSTRAINT Pracownik_Grupa_pk PRIMARY KEY (IdGrupaPracownik)
);

-- foreign keys
-- Reference: Firma_Loginy (table: Firma)
ALTER TABLE Firma ADD CONSTRAINT Firma_Loginy
    FOREIGN KEY (IdKontaFirmy)
    REFERENCES Loginy (IdKonta)  
    NOT DEFERRABLE 
    INITIALLY IMMEDIATE
;

-- Reference: Firma_Pracownik_Firma (table: Firma_Pracownik)
ALTER TABLE Firma_Pracownik ADD CONSTRAINT Firma_Pracownik_Firma
    FOREIGN KEY (IdKontaFirmy)
    REFERENCES Firma (IdKontaFirmy)  
    NOT DEFERRABLE 
    INITIALLY IMMEDIATE
;

-- Reference: Grupa_Firma (table: Grupa)
ALTER TABLE Grupa ADD CONSTRAINT Grupa_Firma
    FOREIGN KEY (IdKontaFirmy)
    REFERENCES Firma (IdKontaFirmy)  
    NOT DEFERRABLE 
    INITIALLY IMMEDIATE
;

-- Reference: Pracownik_Grupa_Grupa (table: Pracownik_Grupa)
ALTER TABLE Pracownik_Grupa ADD CONSTRAINT Pracownik_Grupa_Grupa
    FOREIGN KEY (IdGrupy)
    REFERENCES Grupa (IdGrupy)  
    NOT DEFERRABLE 
    INITIALLY IMMEDIATE
;

-- Reference: Pracownik_Grupa_Pracownik (table: Pracownik_Grupa)
ALTER TABLE Pracownik_Grupa ADD CONSTRAINT Pracownik_Grupa_Pracownik
    FOREIGN KEY (IdPracownika)
    REFERENCES Pracownik (IdPracownika)  
    NOT DEFERRABLE 
    INITIALLY IMMEDIATE
;

-- Reference: Pracownik_Loginy (table: Pracownik)
ALTER TABLE Pracownik ADD CONSTRAINT Pracownik_Loginy
    FOREIGN KEY (IdKonta)
    REFERENCES Loginy (IdKonta)  
    NOT DEFERRABLE 
    INITIALLY IMMEDIATE
;

-- Reference: Table_7_Pracownik (table: Firma_Pracownik)
ALTER TABLE Firma_Pracownik ADD CONSTRAINT Table_7_Pracownik
    FOREIGN KEY (IdPracownika)
    REFERENCES Pracownik (IdPracownika)  
    NOT DEFERRABLE 
    INITIALLY IMMEDIATE
;

-- End of file.

