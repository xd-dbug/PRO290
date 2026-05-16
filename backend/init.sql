create table if not exists users (
    user_id       char(36)     not null default (UUID()),
    email         varchar(100) unique not null,
    username      varchar(100) unique not null,
    password_hash char(60)     not null,
    created_at    timestamp    default current_timestamp(),
    primary key (user_id)
);

create table if not exists notes (
    note_id    int          not null AUTO_INCREMENT,
    user_id    char(36)     not null,
    title      varchar(100) not null,
    body       varchar(255) not null,
    created_at timestamp    default current_timestamp(),
    updated_at timestamp    default current_timestamp() on update current_timestamp(),
    primary key (note_id),
    foreign key (user_id) references users(user_id) on delete cascade
);

create table if not exists sessions (
    session_id      char(36)    not null default (UUID()),
    user_id         char(36)    not null,
    started_at      timestamp   not null default current_timestamp(),
    ended_at        timestamp   null,
    last_heartbeat  timestamp   not null default current_timestamp(),
    duration_minutes int        null,
    is_qualifying   tinyint(1)  not null default 0,
    is_invalidated  tinyint(1)  not null default 0,
    primary key (session_id),
    foreign key (user_id) references users(user_id) on delete cascade
    );