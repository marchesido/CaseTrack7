 Estrutura do Sistema
 CLIENTS (Clientes)

Representa quem contrata a produtora.
Campos:
id (uuid)
name
email
phone
company
createdAt
updatedAt

-------------------------------------------------------------------------------------

PROJECTS (Projetos)

Representa o contrato / projeto fechado com o cliente.

Ex: "Vídeo institucional 2026"

Campos:

id

title

description

budget

status

client (relation)

deadline

createdAt

updatedAt

-------------------------------------------------------------------------------------

PRODUCTIONS (Produções / Entregas)

Representa a execução do projeto.

Ex:

Filmagem

Edição

Motion

Pós-produção

Campos:

id

type

cost

startDate

endDate

project (relation)

notes

createdAt

-------------------------------------------------------------------------------------

Equipments (CRUD 4)
Campos ideais:

id

name

category

serialNumber

purchaseDate

status (available, in_use, maintenance)

dailyCost

createdAt

-------------------------------------------------------------------------------------



Comando anotação: npm run migration:generate -- ./src/db/migrations/nome-migration #criação de migration