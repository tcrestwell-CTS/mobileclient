create policy "Anyone can subscribe to newsletter"
  on newsletter_subscribers for insert
  with check (true);

create policy "Anyone can upsert newsletter subscription"
  on newsletter_subscribers for update
  using (true);